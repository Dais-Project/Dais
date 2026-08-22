from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from src.db.models import agent as agent_models
from src.db.models import skill as skill_models
from src.db.models import tasks as task_models
from src.db.models import toolset as toolset_models
from src.db.models import workspace as workspace_models
from src.schemas import workspace as workspace_schemas

from .repository_base import RepositoryBase


class WorkspaceRepository(RepositoryBase[workspace_models.Workspace]):
    @staticmethod
    def relations():
        return [
            selectinload(workspace_models.Workspace.usable_tools),
            selectinload(workspace_models.Workspace.usable_agents).selectinload(
                agent_models.Agent.model
            ),
            selectinload(workspace_models.Workspace.usable_skills),
            selectinload(workspace_models.Workspace.notes),
        ]

    def get_workspaces_query(
        self,
        query: str | None = None,
    ) -> Select[tuple[workspace_models.Workspace]]:
        stmt = (
            select(workspace_models.Workspace)
            .order_by(workspace_models.Workspace.id.asc())
            .options(*self.relations())
        )
        if query:
            search_term = f"%{query}%"
            stmt = stmt.where(
                workspace_models.Workspace.name.ilike(search_term)
                | workspace_models.Workspace.directory.ilike(search_term)
            )
        return stmt

    async def get_page(self, query: str | None = None):
        return await apaginate(
            self._db_session,
            self.get_workspaces_query(query),
        )

    async def get_all(self) -> list[workspace_models.Workspace]:
        workspaces = (
            await self._db_session.scalars(self.get_workspaces_query())
        ).all()
        return list(workspaces)

    async def get_by_id(
        self,
        workspace_id: int,
    ) -> workspace_models.Workspace | None:
        return await self._db_session.get(
            workspace_models.Workspace,
            workspace_id,
            options=self.relations(),
        )

    async def get_frequent(
        self,
        *,
        limit: int,
        recent_task_limit: int,
    ) -> list[workspace_models.Workspace]:
        recent_tasks_subquery = (
            select(task_models.Task.workspace_id.label("workspace_id"))
            .order_by(task_models.Task.id.desc())
            .limit(recent_task_limit)
            .subquery()
        )
        stmt = (
            select(workspace_models.Workspace)
            .join(
                recent_tasks_subquery,
                recent_tasks_subquery.c.workspace_id
                == workspace_models.Workspace.id,
            )
            .group_by(workspace_models.Workspace.id)
            .order_by(func.count().desc(), workspace_models.Workspace.id.asc())
            .limit(limit)
            .options(*self.relations())
        )
        workspaces = (await self._db_session.scalars(stmt)).all()
        return list(workspaces)

    async def get_agents_by_ids(
        self,
        agent_ids: list[int],
    ) -> list[agent_models.Agent]:
        stmt = (
            select(agent_models.Agent)
            .where(agent_models.Agent.id.in_(agent_ids))
            .options(
                selectinload(agent_models.Agent.model),
                selectinload(agent_models.Agent.usable_tools),
            )
        )
        agents = (await self._db_session.scalars(stmt)).all()
        return list(agents)

    async def get_tools_by_ids(
        self,
        tool_ids: list[int],
    ) -> list[toolset_models.Tool]:
        stmt = select(toolset_models.Tool).where(
            toolset_models.Tool.id.in_(tool_ids)
        )
        tools = (await self._db_session.scalars(stmt)).all()
        return list(tools)

    async def get_skills_by_ids(
        self,
        skill_ids: list[int],
    ) -> list[skill_models.Skill]:
        stmt = select(skill_models.Skill).where(
            skill_models.Skill.id.in_(skill_ids)
        )
        skills = (await self._db_session.scalars(stmt)).all()
        return list(skills)

    async def create(
        self,
        data: workspace_schemas.WorkspaceCreate,
        *,
        agents: list[agent_models.Agent],
        tools: list[toolset_models.Tool],
        skills: list[skill_models.Skill],
    ) -> workspace_models.Workspace:
        create_data = data.model_dump(
            exclude={
                "notes",
                "usable_agent_ids",
                "usable_tool_ids",
                "usable_skill_ids",
            }
        )
        workspace = workspace_models.Workspace(
            **create_data,
            notes=self._create_notes(data.notes),
            usable_agents=agents,
            usable_tools=tools,
            usable_skills=skills,
        )
        self._db_session.add(workspace)
        workspace_id = await self.flush_and_expunge(workspace)
        created_workspace = await self.get_by_id(workspace_id)
        assert created_workspace is not None
        return created_workspace

    async def update(
        self,
        workspace: workspace_models.Workspace,
        data: workspace_schemas.WorkspaceUpdate,
        *,
        agents: list[agent_models.Agent] | None,
        tools: list[toolset_models.Tool] | None,
        skills: list[skill_models.Skill] | None,
    ) -> workspace_models.Workspace:
        self.apply_fields(
            workspace,
            data,
            exclude={
                "usable_agent_ids",
                "usable_tool_ids",
                "usable_skill_ids",
            },
        )
        if agents is not None:
            workspace.usable_agents = agents
        if tools is not None:
            workspace.usable_tools = tools
        if skills is not None:
            workspace.usable_skills = skills

        workspace_id = await self.flush_and_expunge(workspace)
        updated_workspace = await self.get_by_id(workspace_id)
        assert updated_workspace is not None
        return updated_workspace

    async def replace_notes(self,
                            workspace: workspace_models.Workspace,
                            notes: list[workspace_schemas.WorkspaceNoteBase]) -> workspace_models.Workspace:
        workspace.notes = self._create_notes(notes)
        workspace_id = await self.flush_and_expunge(workspace)
        updated_workspace = await self.get_by_id(workspace_id)
        assert updated_workspace is not None
        return updated_workspace

    async def delete(self, workspace: workspace_models.Workspace):
        await self._db_session.delete(workspace)
        await self._db_session.flush()

    @staticmethod
    def _create_notes(notes: list[workspace_schemas.WorkspaceNoteBase]) -> list[workspace_models.WorkspaceNote]:
        return [
            workspace_models.WorkspaceNote(
                relative=note.relative,
                content=note.content,
            )
            for note in notes
        ]

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.db.models import agent as agent_models
from src.db.models import skill as skill_models
from src.db.models import tasks as task_models
from src.db.models import toolset as toolset_models
from src.db.models import workspace as workspace_models
from src.schemas import workspace as workspace_schemas
from .agent import AgentService
from .exceptions import NotFoundError, ServiceErrorCode
from .service_base import ServiceBase


class WorkspaceNotFoundError(NotFoundError):
    def __init__(self, workspace_id: int) -> None:
        super().__init__(ServiceErrorCode.WORKSPACE_NOT_FOUND, "Workspace", workspace_id)

class WorkspaceService(ServiceBase[workspace_models.Workspace]):
    @staticmethod
    def relations():
        return [
            selectinload(workspace_models.Workspace.usable_tools),
            selectinload(workspace_models.Workspace.usable_agents)
                .selectinload(agent_models.Agent.model),
            selectinload(workspace_models.Workspace.usable_skills),
            selectinload(workspace_models.Workspace.notes),
        ]

    def get_workspaces_query(self):
        return (
            select(workspace_models.Workspace)
            .order_by(workspace_models.Workspace.id.asc())
            .options(*self.relations())
        )

    async def _update_relations(
        self,
        workspace: workspace_models.Workspace,
        data: workspace_schemas.WorkspaceCreate | workspace_schemas.WorkspaceUpdate,
    ):
        if data.usable_agent_ids is not None:
            stmt = (
                select(agent_models.Agent)
                .where(agent_models.Agent.id.in_(data.usable_agent_ids))
                .options(*AgentService.relations())
            )
            agents = (await self._db_session.scalars(stmt)).all()
            workspace.usable_agents = list(agents)

        if data.usable_tool_ids is not None:
            stmt = select(toolset_models.Tool).where(
                toolset_models.Tool.id.in_(data.usable_tool_ids)
            )
            tools = (await self._db_session.scalars(stmt)).all()
            workspace.usable_tools = list(tools)

        if data.usable_skill_ids is not None:
            stmt = select(skill_models.Skill).where(
                skill_models.Skill.id.in_(data.usable_skill_ids)
            )
            skills = (await self._db_session.scalars(stmt)).all()
            workspace.usable_skills = list(skills)

    async def get_all_workspaces(self) -> list[workspace_models.Workspace]:
        stmt = (
            select(workspace_models.Workspace)
            .order_by(workspace_models.Workspace.id.asc())
            .options(*self.relations())
        )
        workspaces = (await self._db_session.scalars(stmt)).all()
        return list(workspaces)

    async def get_workspace_by_id(self, id: int) -> workspace_models.Workspace:
        workspace = await self._db_session.get(
            workspace_models.Workspace,
            id,
            options=self.relations(),
        )
        if not workspace:
            raise WorkspaceNotFoundError(id)
        return workspace

    async def get_frequent_workspaces(
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
            .join(recent_tasks_subquery, recent_tasks_subquery.c.workspace_id == workspace_models.Workspace.id)
            .group_by(workspace_models.Workspace.id)
            .order_by(func.count().desc(), workspace_models.Workspace.id.asc())
            .limit(limit)
            .options(*self.relations())
        )
        workspaces = (await self._db_session.scalars(stmt)).all()
        return list(workspaces)

    async def create_workspace(self, data: workspace_schemas.WorkspaceCreate) -> workspace_models.Workspace:
        create_data = data.model_dump(exclude={"notes", "usable_agent_ids", "usable_tool_ids", "usable_skill_ids"})
        new_workspace = workspace_models.Workspace(**create_data)

        new_workspace.notes = [
            workspace_models.WorkspaceNote(
                relative=note.relative,
                content=note.content,
            )
            for note in data.notes
        ]
        await self._update_relations(new_workspace, data)

        self._db_session.add(new_workspace)
        new_id = await self.flush_and_expunge(new_workspace)
        return await self.get_workspace_by_id(new_id)

    async def update_workspace(self, id: int, data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        workspace = await self.get_workspace_by_id(id)

        self.apply_fields(workspace, data, exclude={"notes", "usable_agent_ids", "usable_tool_ids", "usable_skill_ids"})
        await self._update_relations(workspace, data)

        new_id = await self.flush_and_expunge(workspace)
        return await self.get_workspace_by_id(new_id)

    async def update_workspace_notes(self, id, data: workspace_schemas.WorkspaceNotesUpdate):
        workspace = await self.get_workspace_by_id(id)
        workspace.notes = [
            workspace_models.WorkspaceNote(
                relative=note.relative,
                content=note.content,
            )
            for note in data.notes
        ]
        new_id = await self.flush_and_expunge(workspace)
        return await self.get_workspace_by_id(new_id)

    async def delete_workspace(self, id: int) -> None:
        workspace = await self.get_workspace_by_id(id)
        await self._db_session.delete(workspace)
        await self._db_session.flush()

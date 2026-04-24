from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.agent.notes.manager import NoteManager
from src.db.models import workspace as workspace_models
from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models
from src.db.models import skill as skill_models
from src.schemas import workspace as workspace_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .agent import AgentService
from .utils import build_load_options, Relations


class WorkspaceNotFoundError(NotFoundError):
    def __init__(self, workspace_id: int) -> None:
        super().__init__(ServiceErrorCode.WORKSPACE_NOT_FOUND, "Workspace", workspace_id)

class WorkspaceService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [
            workspace_models.Workspace.usable_tools,
            workspace_models.Workspace.usable_agents,
            workspace_models.Workspace.usable_skills,
        ]

    def get_workspaces_query(self):
        return (
            select(workspace_models.Workspace)
            .order_by(workspace_models.Workspace.id.asc())
        )

    async def _update_relations(
        self,
        workspace: workspace_models.Workspace,
        data: workspace_schemas.WorkspaceCreate | workspace_schemas.WorkspaceUpdate,
    ):
        if data.notes is not None:
            workspace.notes = [
                workspace_models.WorkspaceNote(
                    relative=note.relative,
                    content=note.content,
                )
                for note in data.notes
            ]

        if data.usable_agent_ids is not None:
            stmt = (
                select(agent_models.Agent)
                .where(agent_models.Agent.id.in_(data.usable_agent_ids))
                .options(*build_load_options(AgentService.relations()))
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

    async def get_workspace_by_id(self, id: int) -> workspace_models.Workspace:
        workspace = await self._db_session.get(
            workspace_models.Workspace,
            id,
            options=[
                selectinload(workspace_models.Workspace.usable_tools),
                selectinload(workspace_models.Workspace.usable_agents)
                    .selectinload(agent_models.Agent.model),
                selectinload(workspace_models.Workspace.usable_skills),
                selectinload(workspace_models.Workspace.notes),
            ],
        )
        if not workspace:
            raise WorkspaceNotFoundError(id)
        return workspace

    async def create_workspace(self, data: workspace_schemas.WorkspaceCreate) -> workspace_models.Workspace:
        create_data = data.model_dump(exclude={"notes", "usable_agent_ids", "usable_tool_ids", "usable_skill_ids"})
        new_workspace = workspace_models.Workspace(**create_data)

        await self._update_relations(new_workspace, data)

        self._db_session.add(new_workspace)
        await self._db_session.flush()

        new_workspace = await self.get_workspace_by_id(new_workspace.id)
        return new_workspace

    async def update_workspace(self, id: int, data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        workspace = await self.get_workspace_by_id(id)

        self.apply_fields(workspace, data, exclude={"notes", "usable_agent_ids", "usable_tool_ids", "usable_skill_ids"})
        await self._update_relations(workspace, data)

        await self._db_session.flush()
        self._db_session.expunge(workspace)

        updated_workspace = await self.get_workspace_by_id(workspace.id)
        return updated_workspace

    async def delete_workspace(self, id: int) -> None:
        workspace = await self.get_workspace_by_id(id)
        await self._db_session.delete(workspace)
        await self._db_session.flush()
        await NoteManager(workspace.id).clear_materialized(force=True)

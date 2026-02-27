from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import workspace as workspace_models
from ..db.models import agent as agent_models
from ..db.models import toolset as toolset_models
from ..schemas import workspace as workspace_schemas


class WorkspaceNotFoundError(NotFoundError):
    """Raised when a workspace is not found."""

    def __init__(self, workspace_id: int) -> None:
        super().__init__("Workspace", workspace_id)


class WorkspaceService(ServiceBase):
    def get_workspaces_query(self):
        return (
            select(workspace_models.Workspace)
            .order_by(workspace_models.Workspace.id.asc())
        )

    async def _update_relations(self,
                                workspace: workspace_models.Workspace,
                                data: workspace_schemas.WorkspaceCreate | workspace_schemas.WorkspaceUpdate
                                ):
        if data.usable_agent_ids is not None:
            stmt = select(agent_models.Agent).where(
                agent_models.Agent.id.in_(data.usable_agent_ids)
            )
            agents = (await self._db_session.scalars(stmt)).all()
            workspace.usable_agents = list(agents)

        if data.usable_tool_ids is not None:
            stmt = select(toolset_models.Tool).where(
                toolset_models.Tool.id.in_(data.usable_tool_ids)
            )
            tools = (await self._db_session.scalars(stmt)).all()
            workspace.usable_tools = list(tools)

    async def get_workspace_by_id(self, id: int) -> workspace_models.Workspace:
        workspace = await self._db_session.get(
            workspace_models.Workspace, id,
            options=[
                selectinload(workspace_models.Workspace.usable_agents),
                selectinload(workspace_models.Workspace.usable_tools),
            ],
        )
        if not workspace:
            raise WorkspaceNotFoundError(id)
        return workspace

    async def create_workspace(self, data: workspace_schemas.WorkspaceCreate) -> workspace_models.Workspace:
        create_data = data.model_dump(exclude={"usable_agent_ids", "usable_tool_ids"})
        new_workspace = workspace_models.Workspace(**create_data)

        await self._update_relations(new_workspace, data)

        self._db_session.add(new_workspace)
        await self._db_session.flush()

        new_workspace = await self.get_workspace_by_id(new_workspace.id)
        return new_workspace

    async def update_workspace(self, id: int, data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        workspace = await self.get_workspace_by_id(id)
        if not workspace:
            raise WorkspaceNotFoundError(id)

        update_data = data.model_dump(exclude_unset=True,
                                                      exclude={"usable_agent_ids", "usable_tool_ids"})
        for key, value in update_data.items():
            if hasattr(workspace, key) and value is not None:
                setattr(workspace, key, value)

        await self._update_relations(workspace, data)
        await self._db_session.flush()

        updated_workspace = await self.get_workspace_by_id(workspace.id)
        return updated_workspace

    async def delete_workspace(self, id: int) -> None:
        workspace = await self._db_session.get(workspace_models.Workspace, id)
        if not workspace:
            raise WorkspaceNotFoundError(id)
        await self._db_session.delete(workspace)

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import workspace as workspace_models
from ..db.models import agent as agent_models
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
        usable_agent_ids = data.usable_agent_ids
        new_workspace = workspace_models.Workspace(
            **data.model_dump(exclude={"usable_agent_ids"})
        )

        if usable_agent_ids is not None:
            stmt = select(agent_models.Agent).where(
                agent_models.Agent.id.in_(usable_agent_ids)
            )
            agents = (await self._db_session.scalars(stmt)).all()
            new_workspace.usable_agents = list(agents)

        self._db_session.add(new_workspace)
        await self._db_session.flush()
        await self._db_session.refresh(new_workspace)
        return new_workspace

    async def update_workspace(self, id: int, data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        workspace = await self.get_workspace_by_id(id)
        if not workspace:
            raise WorkspaceNotFoundError(id)

        usable_agent_ids = data.usable_agent_ids

        update_data = data.model_dump(exclude_unset=True, exclude={"usable_agent_ids"})
        for key, value in update_data.items():
            if hasattr(workspace, key) and value is not None:
                setattr(workspace, key, value)

        if usable_agent_ids is not None:
            stmt = select(agent_models.Agent).where(
                agent_models.Agent.id.in_(usable_agent_ids)
            )
            agents = (await self._db_session.execute(stmt)).scalars().all()
            workspace.usable_agents = list(agents)

        await self._db_session.flush()
        await self._db_session.refresh(workspace)
        return workspace

    async def delete_workspace(self, id: int) -> None:
        workspace = await self._db_session.get(workspace_models.Workspace, id)
        if not workspace:
            raise WorkspaceNotFoundError(id)
        await self._db_session.delete(workspace)

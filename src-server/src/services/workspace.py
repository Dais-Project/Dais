from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from .exceptions import NotFoundError
from ..db.models import workspace as workspace_models
from ..db.models import agent as agent_models
from ..db.schemas import workspace as workspace_schemas

class WorkspaceNotFoundError(NotFoundError):
    """Raised when a workspace is not found."""
    def __init__(self, workspace_id: int) -> None:
        super().__init__("Workspace", workspace_id)

class WorkspaceService(ServiceBase):
    def get_workspaces(self, page: int = 1, per_page: int = 10) -> dict:
        if page < 1: page = 1
        if per_page < 5 or per_page > 100: per_page = 10

        count_stmt = select(func.count(workspace_models.Workspace.id))
        total = self._db_session.execute(count_stmt).scalar() or 0

        offset = (page - 1) * per_page
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        stmt = select(workspace_models.Workspace).options(
            selectinload(workspace_models.Workspace.usable_agents)
        ).limit(per_page).offset(offset)
        workspaces = self._db_session.execute(stmt).scalars().all()

        return {
            "items": list(workspaces),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

    def get_workspace_by_id(self, id: int) -> workspace_models.Workspace:
        workspace = self._db_session.get(
            workspace_models.Workspace,
            id,
            options=[selectinload(workspace_models.Workspace.usable_agents)])
        if not workspace:
            raise WorkspaceNotFoundError(id)
        return workspace

    def create_workspace(self, data: workspace_schemas.WorkspaceCreate) -> workspace_models.Workspace:
        usable_agent_ids = data.usable_agent_ids
        new_workspace = workspace_models.Workspace(**data.model_dump(exclude={"usable_agent_ids"}))

        if usable_agent_ids is not None:
            stmt = select(agent_models.Agent).where(
                agent_models.Agent.id.in_(usable_agent_ids))
            agents = self._db_session.execute(stmt).scalars().all()
            new_workspace.usable_agents = list(agents)

        try:
            self._db_session.add(new_workspace)
            self._db_session.commit()
            self._db_session.refresh(new_workspace)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_workspace

    def update_workspace(self, id: int, data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        stmt = select(workspace_models.Workspace).where(
            workspace_models.Workspace.id == id)
        workspace = self._db_session.execute(stmt).scalar_one_or_none()
        if not workspace:
            raise WorkspaceNotFoundError(id)

        usable_agent_ids = data.usable_agent_ids

        for key, value in data.model_dump(exclude_unset=True, exclude={"usable_agent_ids"}).items():
            if value is not None:
                setattr(workspace, key, value)

        if usable_agent_ids is not None:
            stmt = select(agent_models.Agent).where(
                agent_models.Agent.id.in_(usable_agent_ids))
            agents = self._db_session.execute(stmt).scalars().all()
            workspace.usable_agents = list(agents)

        try:
            self._db_session.commit()
            self._db_session.refresh(workspace)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return workspace

    def delete_workspace(self, id: int) -> None:
        stmt = select(workspace_models.Workspace).where(
            workspace_models.Workspace.id == id)
        workspace = self._db_session.execute(stmt).scalar_one_or_none()
        if not workspace:
            raise WorkspaceNotFoundError(id)
        try:
            self._db_session.delete(workspace)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

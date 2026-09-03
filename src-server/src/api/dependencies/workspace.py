from typing import Annotated

from fastapi import Depends

from src.repositories.workspace import WorkspaceRepository
from src.services.workspace import WorkspaceService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_workspace_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> WorkspaceService:
    return WorkspaceService(
        WorkspaceRepository(db_session),
        on_resource_changed,
    )


WorkspaceServiceDep = Annotated[
    WorkspaceService,
    Depends(get_workspace_service),
]

from typing import Annotated

from fastapi import Depends

from src.repositories.workspace import WorkspaceRepository
from src.services.workspace import WorkspaceService

from .db_session import DbSessionDep


def get_workspace_repository(
    db_session: DbSessionDep,
) -> WorkspaceRepository:
    return WorkspaceRepository(db_session)


WorkspaceRepositoryDep = Annotated[
    WorkspaceRepository,
    Depends(get_workspace_repository),
]


def get_workspace_service(
    repository: WorkspaceRepositoryDep,
) -> WorkspaceService:
    return WorkspaceService(repository)


WorkspaceServiceDep = Annotated[
    WorkspaceService,
    Depends(get_workspace_service),
]

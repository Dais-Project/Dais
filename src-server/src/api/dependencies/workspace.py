from typing import Annotated

from fastapi import Depends

from src.services.workspace import WorkspaceService

from .db_session import DbSessionDep


def get_workspace_service(db_session: DbSessionDep) -> WorkspaceService:
    return WorkspaceService.from_db_session(db_session)


WorkspaceServiceDep = Annotated[
    WorkspaceService,
    Depends(get_workspace_service),
]

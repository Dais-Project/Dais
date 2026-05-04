from fastapi import APIRouter, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from src.db import DbSessionDep
from src.agent.notes import NoteMaterializer, WorkspaceRefManager
from src.services.workspace import WorkspaceService
from src.schemas import workspace as workspace_schemas
from src.utils.open_in_file_manager import open_in_file_manager
from ..exceptions import ApiError, ApiErrorCode


workspaces_router = APIRouter(tags=["workspace"])

@workspaces_router.get("/", response_model=Page[workspace_schemas.WorkspaceBrief])
async def get_workspaces(db_session: DbSessionDep):
    query = WorkspaceService(db_session).get_workspaces_query()
    return await apaginate(db_session, query)

@workspaces_router.get("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
async def get_workspace(workspace_id: int, db_session: DbSessionDep):
    return await WorkspaceService(db_session).get_workspace_by_id(workspace_id)

@workspaces_router.post("/", status_code=status.HTTP_201_CREATED, response_model=workspace_schemas.WorkspaceRead)
async def create_workspace(
    db_session: DbSessionDep,
    body: workspace_schemas.WorkspaceCreate,
):
    created_workspace = await WorkspaceService(db_session).create_workspace(body)
    workspace = workspace_schemas.WorkspaceRead.model_validate(created_workspace)
    await NoteMaterializer.materialize(workspace)
    return workspace

@workspaces_router.put("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
async def update_workspace(
    workspace_id: int,
    body: workspace_schemas.WorkspaceUpdate,
    db_session: DbSessionDep,
):
    return await WorkspaceService(db_session).update_workspace(workspace_id, body)

@workspaces_router.put("/{workspace_id}/notes", response_model=workspace_schemas.WorkspaceRead)
async def update_workspace_notes(
    workspace_id: int,
    body: workspace_schemas.WorkspaceNotesUpdate,
    db_session: DbSessionDep,
):
    if WorkspaceRefManager.is_workspace_in_use(workspace_id):
        raise ApiError(status.HTTP_409_CONFLICT, ApiErrorCode.WORKSPACE_NOTES_LOCKED_BY_RUNNING_TASK)
    updated_workspace = await WorkspaceService(db_session).update_workspace_notes(workspace_id, body)
    workspace = workspace_schemas.WorkspaceRead.model_validate(updated_workspace)
    await NoteMaterializer.clear_materialized(workspace.id)
    await NoteMaterializer.materialize(workspace)
    return workspace

@workspaces_router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: int, db_session: DbSessionDep):
    await WorkspaceService(db_session).delete_workspace(workspace_id)
    await NoteMaterializer.clear_materialized(workspace_id)

# --- --- --- --- --- ---

@workspaces_router.post("/{workspace_id}/open", status_code=status.HTTP_204_NO_CONTENT)
async def open_workspace(workspace_id: int, db_session: DbSessionDep):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    await open_in_file_manager(workspace.directory)

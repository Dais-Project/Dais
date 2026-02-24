from fastapi import APIRouter, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from ...db import DbSessionDep
from ...services.workspace import WorkspaceService
from ...schemas import workspace as workspace_schemas

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
    return await WorkspaceService(db_session).create_workspace(body)

@workspaces_router.put("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
async def update_workspace(
    workspace_id: int,
    body: workspace_schemas.WorkspaceUpdate,
    db_session: DbSessionDep,
):
    return await WorkspaceService(db_session).update_workspace(workspace_id, body)

@workspaces_router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: int, db_session: DbSessionDep):
    await WorkspaceService(db_session).delete_workspace(workspace_id)

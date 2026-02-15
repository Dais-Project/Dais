from typing import Annotated
from fastapi import APIRouter, Depends, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from ...services.workspace import WorkspaceService
from ...db.schemas import workspace as workspace_schemas

workspaces_router = APIRouter(tags=["workspace"])

def get_workspace_service():
    with WorkspaceService() as service:
        yield service

WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]

@workspaces_router.get("/", response_model=Page[workspace_schemas.WorkspaceBrief])
def get_workspaces(service: WorkspaceServiceDep):
    query = service.get_workspaces_query()
    return paginate(service.db_session, query)

@workspaces_router.get("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
def get_workspace(workspace_id: int, service: WorkspaceServiceDep):
    workspace = service.get_workspace_by_id(workspace_id)
    return workspace_schemas.WorkspaceRead.model_validate(workspace)

@workspaces_router.post("/", status_code=status.HTTP_201_CREATED, response_model=workspace_schemas.WorkspaceRead)
def create_workspace(
    service: WorkspaceServiceDep,
    body: workspace_schemas.WorkspaceCreate,
):
    new_workspace = service.create_workspace(body)
    return workspace_schemas.WorkspaceRead.model_validate(new_workspace)

@workspaces_router.put("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
def update_workspace(
    workspace_id: int,
    body: workspace_schemas.WorkspaceUpdate,
    service: WorkspaceServiceDep,
):
    updated_workspace = service.update_workspace(workspace_id, body)
    return workspace_schemas.WorkspaceRead.model_validate(updated_workspace)

@workspaces_router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(workspace_id: int, service: WorkspaceServiceDep):
    service.delete_workspace(workspace_id)

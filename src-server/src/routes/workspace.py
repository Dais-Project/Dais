from typing import Annotated
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel
from .types import PaginatedResponse
from ..services.workspace import WorkspaceService
from ..db.schemas import workspace as workspace_schemas

workspaces_router = APIRouter()

def get_workspace_service():
    with WorkspaceService() as service:
        yield service

WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]

class WorkspacesQueryModel(BaseModel):
    page: int = 1
    per_page: int = 10

@workspaces_router.get("/", response_model=PaginatedResponse[workspace_schemas.WorkspaceRead])
def get_workspaces(
    service: WorkspaceServiceDep,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1),
):
    result = service.get_workspaces(page, per_page)

    return PaginatedResponse[workspace_schemas.WorkspaceRead](
        items=[workspace_schemas.WorkspaceRead.model_validate(workspace)
               for workspace in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        total_pages=result["total_pages"]
    )

# TODO: workspace brief API

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

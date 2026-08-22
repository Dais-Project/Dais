from fastapi import APIRouter
from fastapi import Query
from fastapi import status
from fastapi_pagination import Page

from src.schemas import workspace as workspace_schemas

from ..dependencies import WorkspaceServiceDep


workspaces_router = APIRouter(tags=["workspace"])

@workspaces_router.get("/", response_model=Page[workspace_schemas.WorkspaceBrief])
async def get_workspaces(service: WorkspaceServiceDep, query: str | None = Query(default=None)):
    return await service.get_page(query)

@workspaces_router.get("/frequents/", response_model=list[workspace_schemas.WorkspaceBrief])
async def get_frequent_workspaces(service: WorkspaceServiceDep,
                                  limit: int = Query(default=3, ge=1),
                                  recent_task_limit: int = Query(default=30, ge=1)):
    return await service.get_frequent(
        limit=limit,
        recent_task_limit=recent_task_limit,
    )

@workspaces_router.get("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
async def get_workspace(service: WorkspaceServiceDep, workspace_id: int):
    return await service.get_by_id(workspace_id)

@workspaces_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=workspace_schemas.WorkspaceRead,
)
async def create_workspace(service: WorkspaceServiceDep, body: workspace_schemas.WorkspaceCreate):
    return await service.create(body)

@workspaces_router.put("/{workspace_id}", response_model=workspace_schemas.WorkspaceRead)
async def update_workspace(service: WorkspaceServiceDep,
                           workspace_id: int,
                           body: workspace_schemas.WorkspaceUpdate):
    return await service.update(workspace_id, body)

@workspaces_router.put("/{workspace_id}/notes", response_model=workspace_schemas.WorkspaceRead)
async def update_workspace_notes(service: WorkspaceServiceDep,
                                  workspace_id: int,
                                  body: workspace_schemas.WorkspaceNotesUpdate):
    return await service.update_notes(workspace_id, body)

@workspaces_router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(service: WorkspaceServiceDep, workspace_id: int):
    await service.delete(workspace_id)

@workspaces_router.post("/{workspace_id}/open", status_code=status.HTTP_204_NO_CONTENT)
async def open_workspace(service: WorkspaceServiceDep, workspace_id: int):
    await service.open_in_file_manager(workspace_id)

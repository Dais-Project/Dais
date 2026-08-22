from fastapi import APIRouter
from fastapi import Query
from fastapi import status
from fastapi_pagination import Page

from src.schemas.tasks import task as task_schemas

from ...dependencies import TaskServiceDep


task_manage_router = APIRouter(tags=["task"])

@task_manage_router.get("/", response_model=Page[task_schemas.TaskBrief])
async def get_tasks(service: TaskServiceDep,
                    workspace_id: int = Query(...),
                    query: str | None = Query(default=None)):
    return await service.get_page(workspace_id, query)

@task_manage_router.get("/recent", response_model=Page[task_schemas.TaskBrief])
async def get_recent_tasks(service: TaskServiceDep):
    return await service.get_recent_page()

@task_manage_router.get("/{task_id}", response_model=task_schemas.TaskRead)
async def get_task(service: TaskServiceDep, task_id: int):
    return await service.get_by_id(task_id)

@task_manage_router.post("/",
                         status_code=status.HTTP_201_CREATED,
                         response_model=task_schemas.TaskRead)
async def create_task(service: TaskServiceDep, body: task_schemas.TaskCreate):
    return await service.create(body)

@task_manage_router.post("/{task_id}/summarize-title", response_model=task_schemas.TaskRead)
async def summarize_task_title(service: TaskServiceDep, task_id: int):
    return await service.summarize_title(task_id)

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(service: TaskServiceDep, task_id: int):
    await service.delete(task_id)

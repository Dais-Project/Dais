from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from .message import TaskRead as ApiTaskRead, TaskCreate as ApiTaskCreate
from ..types import PaginatedResponse
from ....services.task import TaskService
from ....db.schemas import task as task_schemas

task_manage_router = APIRouter(tags=["task"])

class TasksQueryModel(BaseModel):
    workspace_id: int
    page: int = 1
    per_page: int = 15

def get_task_service():
    with TaskService() as service:
        yield service

TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]

@task_manage_router.get("/", response_model=PaginatedResponse[ApiTaskRead])
def get_tasks(
    service: TaskServiceDep,
    workspace_id: int = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1),
):
    result = service.get_tasks(workspace_id, page, per_page)

    return PaginatedResponse[ApiTaskRead](
        items=[ApiTaskRead.model_validate(task)
               for task in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        total_pages=result["total_pages"]
    )

# TODO: task brief API

@task_manage_router.get("/{task_id}", response_model=ApiTaskRead)
def get_task(task_id: int, service: TaskServiceDep):
    task = service.get_task_by_id(task_id)
    return ApiTaskRead.model_validate(task)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=ApiTaskRead)
def new_task(service: TaskServiceDep, body: ApiTaskCreate):
    new_task = service.create_task(task_schemas.TaskCreate.model_validate(body))
    return ApiTaskRead.model_validate(new_task)

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, service: TaskServiceDep):
    service.delete_task(task_id)

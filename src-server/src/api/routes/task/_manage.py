from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
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

@task_manage_router.get("/", response_model=PaginatedResponse[task_schemas.TaskRead])
def get_tasks(
    service: TaskServiceDep,
    workspace_id: int = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1),
):
    result = service.get_tasks(workspace_id, page, per_page)

    return PaginatedResponse[task_schemas.TaskRead](
        items=[task_schemas.TaskRead.model_validate(task)
               for task in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        total_pages=result["total_pages"]
    )

# TODO: task brief API

@task_manage_router.get("/{task_id}", response_model=task_schemas.TaskRead)
def get_task(task_id: int, service: TaskServiceDep):
    task = service.get_task_by_id(task_id)
    return task_schemas.TaskRead.model_validate(task)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=task_schemas.TaskRead)
def new_task(
    service: TaskServiceDep,
    body: task_schemas.TaskCreate,
):
    new_task = service.create_task(body)
    return task_schemas.TaskRead.model_validate(new_task)

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, service: TaskServiceDep):
    service.delete_task(task_id)

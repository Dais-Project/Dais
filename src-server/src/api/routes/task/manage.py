from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from .message import (
    TaskBrief as ApiTaskBrief,
    TaskRead as ApiTaskRead,
    TaskCreate as ApiTaskCreate
)
from ....services.task import TaskService
from ....db.schemas import task as task_schemas

task_manage_router = APIRouter(tags=["task"])

def get_task_service():
    with TaskService() as service:
        yield service

TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]

@task_manage_router.get("/", response_model=Page[ApiTaskBrief])
def get_tasks(service: TaskServiceDep, workspace_id: int = Query(...)):
    query = service.get_tasks_query(workspace_id)
    return paginate(service.db_session, query)

@task_manage_router.get("/{task_id}", response_model=ApiTaskRead)
def get_task(task_id: int, service: TaskServiceDep):
    task = service.get_task_by_id(task_id)
    return ApiTaskRead.model_validate(task)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=ApiTaskRead)
def new_task(service: TaskServiceDep, body: ApiTaskCreate):
    new_task = service.create_task(task_schemas.TaskCreate.model_validate(body, from_attributes=True))
    return ApiTaskRead.model_validate(new_task)

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, service: TaskServiceDep):
    service.delete_task(task_id)

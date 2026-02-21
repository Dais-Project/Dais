from fastapi import APIRouter, Query, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from .message import (
    TaskBrief as ApiTaskBrief,
    TaskRead as ApiTaskRead,
    TaskCreate as ApiTaskCreate,
)
from ....db import DbSessionDep
from ....services.task import TaskService
from ....schemas import task as task_schemas

task_manage_router = APIRouter(tags=["task"])


@task_manage_router.get("/", response_model=Page[ApiTaskBrief])
async def get_tasks(db_session: DbSessionDep, workspace_id: int = Query(...)):
    query = TaskService(db_session).get_tasks_query(workspace_id)
    return await apaginate(db_session, query)

@task_manage_router.get("/{task_id}", response_model=ApiTaskRead)
async def get_task(task_id: int, db_session: DbSessionDep):
    task = await TaskService(db_session).get_task_by_id(task_id)
    return ApiTaskRead.model_validate(task)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=ApiTaskRead)
async def new_task(db_session: DbSessionDep, body: ApiTaskCreate):
    created_task = await TaskService(db_session).create_task(
        task_schemas.TaskCreate.model_validate(body, from_attributes=True)
    )
    return ApiTaskRead.model_validate(created_task)

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db_session: DbSessionDep):
    await TaskService(db_session).delete_task(task_id)

from fastapi import APIRouter, Query, BackgroundTasks, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from .message import (
    TaskBrief as ApiTaskBrief,
    TaskRead as ApiTaskRead,
    TaskCreate as ApiTaskCreate,
)
from .background_task import summarize_title_in_background
from ...sse_dispatcher import SseDispatcherDep
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
    return await TaskService(db_session).get_task_by_id(task_id)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=ApiTaskRead)
async def new_task(
    body: ApiTaskCreate,
    db_session: DbSessionDep,
    sse_dispatcher: SseDispatcherDep,
    background_tasks: BackgroundTasks,
):
    created_task = await TaskService(db_session).create_task(
        task_schemas.TaskCreate.model_validate(body, from_attributes=True))

    # commit to make ensure task_id is assigned and available in background task
    await db_session.commit()

    background_tasks.add_task(summarize_title_in_background,
                              created_task.id, body.messages, sse_dispatcher)
    return created_task

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db_session: DbSessionDep):
    await TaskService(db_session).delete_task(task_id)

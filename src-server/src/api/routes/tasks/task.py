import time
from loguru import logger
from fastapi import APIRouter, Query, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from src.agent.prompts import create_one_turn_llm, TitleSummarization
from src.settings import use_app_setting_manager
from src.db import DbSessionDep
from src.db.models import agent as agent_models
from src.db.models import tasks as task_models
from src.services.tasks import TaskService
from src.schemas.tasks import task as task_schemas
from ...exceptions import ApiError, ApiErrorCode


task_manage_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskManageRoute")

@task_manage_router.get("/", response_model=Page[task_schemas.TaskBrief])
async def get_tasks(db_session: DbSessionDep, workspace_id: int = Query(...)):
    tasks_query = TaskService(db_session).get_tasks_query(workspace_id)
    final_query = (
        tasks_query
        .add_columns(agent_models.Agent.icon_name)
        .outerjoin(task_models.Task.agent)
    )
    def transformer(rows):
        return [
            task_schemas.TaskBrief.model_validate({**task.__dict__, "icon_name": icon_name})
            for task, icon_name in rows
        ]
    return await apaginate(db_session, final_query, transformer=transformer)

@task_manage_router.get("/recent", response_model=Page[task_schemas.TaskBrief])
async def get_recent_tasks(db_session: DbSessionDep):
    tasks_query = TaskService(db_session).get_recent_tasks_query()
    final_query = (
        tasks_query
        .add_columns(agent_models.Agent.icon_name)
        .outerjoin(task_models.Task.agent)
    )
    def transformer(rows):
        return [
            task_schemas.TaskBrief.model_validate({**task.__dict__, "icon_name": icon_name})
            for task, icon_name in rows
        ]
    return await apaginate(db_session, final_query, transformer=transformer)

@task_manage_router.get("/{task_id}", response_model=task_schemas.TaskRead)
async def get_task(task_id: int, db_session: DbSessionDep):
    return await TaskService(db_session).get_task_by_id(task_id)

@task_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=task_schemas.TaskRead)
async def create_task(body: task_schemas.TaskCreate, db_session: DbSessionDep):
    new_task = await TaskService(db_session).create_task(body)
    await db_session.commit() # ensure new task persisted when frontend calls `/summarize-title`
    return new_task

@task_manage_router.post("/{task_id}/summarize-title", response_model=task_schemas.TaskRead)
async def summarize_task_title(task_id: int, db_session: DbSessionDep):
    task = await TaskService(db_session).get_task_by_id(task_id)

    settings = use_app_setting_manager().settings
    if settings.flash_model is None:
        raise ApiError(status.HTTP_500_INTERNAL_SERVER_ERROR, ApiErrorCode.SUMMARIZE_TITLE_FAILED)
    if len(task.messages) == 0:
        raise ApiError(status.HTTP_500_INTERNAL_SERVER_ERROR, ApiErrorCode.SUMMARIZE_TITLE_FAILED, "No message to summarize.")

    try:
        llm = await create_one_turn_llm(settings.flash_model)
        summarizer = TitleSummarization(llm, settings.reply_language)
        title = await summarizer(task.messages)
    except Exception as e:
        _logger.exception("Failed to request title summarization")
        raise ApiError(status.HTTP_500_INTERNAL_SERVER_ERROR, ApiErrorCode.SUMMARIZE_TITLE_FAILED, str(e))

    if len(title) == 0:
        raise ApiError(status.HTTP_500_INTERNAL_SERVER_ERROR, ApiErrorCode.SUMMARIZE_TITLE_FAILED, "Generated empty content")

    update_data = task_schemas.TaskUpdate(
        title=title,
        messages=None,
        agent_id=None,
        last_run_at=int(time.time()),
        usage=None,
    )
    task = await TaskService(db_session).update_task(task_id, update_data)
    return task

@task_manage_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db_session: DbSessionDep):
    await TaskService(db_session).delete_task(task_id)

from fastapi import APIRouter
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from src.agent.context import AgentContext
from src.agent.task import AgentTask
from src.db import DbSessionDep, db_context
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks import RunRecordService, TaskService


async def _load_task_runtime_context(db_session: AsyncSession,
                                     task_id: int,
                                     agent_id: int | None,
                                     ) -> task_runtime_schemas.TaskRuntimeContext:
    task = await TaskService(db_session).get_task_by_id(task_id)
    if agent_id is not None:
        task.agent_id = agent_id
    return task_runtime_schemas.TaskRuntimeContext.model_validate(task)

async def _load_schedule_runtime_context(db_session: AsyncSession,
                                         task_id: int,
                                         agent_id: int | None,
                                         ) -> task_runtime_schemas.TaskRuntimeContext:
    record = await RunRecordService(db_session).get_run_record_by_id(task_id)
    if agent_id is not None:
        record.schedule.agent_id = agent_id
    return task_runtime_schemas.TaskRuntimeContext(
        id=record.id,
        type=task_runtime_schemas.TaskType.SCHEDULE,
        usage=record.usage,
        agent_id=record.schedule.agent_id,
        workspace_id=record.schedule.workspace_id,
        messages=record.messages,
    )

async def load_task_runtime_context(
    db_session: AsyncSession,
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    agent_id: int | None = None,
) -> task_runtime_schemas.TaskRuntimeContext:
    match task_type:
        case task_runtime_schemas.TaskType.TASK:
            return await _load_task_runtime_context(db_session, task_id, agent_id)
        case task_runtime_schemas.TaskType.SCHEDULE:
            return await _load_schedule_runtime_context(db_session, task_id, agent_id)

async def create_agent_task(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    agent_id: int,
) -> AgentTask:
    async with db_context() as db_session:
        runtime_context = await load_task_runtime_context(db_session, task_type, task_id, agent_id)
    ctx = await AgentContext.create(runtime_context)
    return AgentTask(ctx)

task_runtime_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskRuntimeRoute")

@task_runtime_router.get("/{task_type}/{task_id}", response_model=task_runtime_schemas.TaskRuntimeContext)
async def get_task_runtime_context(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    db_session: DbSessionDep,
):
    return await load_task_runtime_context(db_session, task_type, task_id)

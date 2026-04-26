from src.agent.context import AgentContext
from src.agent.task import AgentTask
from src.db import db_context
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks import RunRecordService, TaskService


async def _load_normal_task_runtime_context(
    task_id: int,
    agent_id: int,
) -> task_runtime_schemas.TaskRuntimeContext:
    async with db_context() as db_session:
        task = await TaskService(db_session).get_task_by_id(task_id)
        task.agent_id = agent_id
        return task_runtime_schemas.TaskRuntimeContext.model_validate(task)

async def _load_schedule_runtime_context(
    task_id: int,
    agent_id: int,
) -> task_runtime_schemas.TaskRuntimeContext:
    async with db_context() as db_session:
        record = await RunRecordService(db_session).get_run_record_by_id(task_id)
        return task_runtime_schemas.TaskRuntimeContext(
            id=record.id,
            type=task_runtime_schemas.TaskType.SCHEDULE,
            usage=record.usage,
            agent_id=agent_id,
            workspace_id=record.schedule.workspace_id,
            messages=record.messages,
        )

async def load_task_runtime_context(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    agent_id: int,
) -> task_runtime_schemas.TaskRuntimeContext:
    match task_type:
        case task_runtime_schemas.TaskType.TASK:
            return await _load_normal_task_runtime_context(task_id, agent_id)
        case task_runtime_schemas.TaskType.SCHEDULE:
            return await _load_schedule_runtime_context(task_id, agent_id)

async def create_agent_task(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    agent_id: int,
) -> AgentTask:
    runtime_context = await load_task_runtime_context(task_type, task_id, agent_id)
    ctx = await AgentContext.create(runtime_context)
    return AgentTask(ctx)

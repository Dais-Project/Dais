from fastapi import APIRouter
from loguru import logger

from src.schemas.tasks import runtime as task_runtime_schemas
from src.agent.task.runtime_manager import AgentTaskRuntimeRef, use_agent_task_runtime_manager

from ...dependencies import AgentTaskExecutorDep, DbSessionDep


task_runtime_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskRuntimeRoute")

class TaskRuntimeContextResponse(task_runtime_schemas.TaskRuntimeContext):
    revision: int | None = None

@task_runtime_router.get(
    "/{task_type}/{task_id}",
    response_model=TaskRuntimeContextResponse,
)
async def get_task_runtime_context(
    db_session: DbSessionDep,
    executor: AgentTaskExecutorDep,
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
):
    if task_type == task_runtime_schemas.TaskType.TASK:
        checkpoint = await executor.get_checkpoint(task_id)
        if checkpoint is not None:
            return TaskRuntimeContextResponse(**checkpoint.snapshot.model_dump(),
                                              revision=checkpoint.revision)

    task_ref = AgentTaskRuntimeRef(type=task_type, id=task_id)
    runtime_context = await use_agent_task_runtime_manager()\
        .load_task_runtime_context(db_session, task_ref)
    return TaskRuntimeContextResponse.model_validate(runtime_context)

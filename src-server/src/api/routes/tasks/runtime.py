from fastapi import APIRouter
from loguru import logger

from src.schemas.tasks import runtime as task_runtime_schemas
from src.agent.task.runtime_manager import AgentTaskRuntimeRef, use_agent_task_runtime_manager

from ...dependencies import DbSessionDep


task_runtime_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskRuntimeRoute")

@task_runtime_router.get("/{task_type}/{task_id}", response_model=task_runtime_schemas.TaskRuntimeContext)
async def get_task_runtime_context(db_session: DbSessionDep,
                                   task_type: task_runtime_schemas.TaskType,
                                   task_id: int):
    task_ref = AgentTaskRuntimeRef(type=task_type, id=task_id)
    return await use_agent_task_runtime_manager()\
        .load_task_runtime_context(db_session, task_ref)

import time
from typing import TYPE_CHECKING
from dais_sdk.types import Message
from src.db import db_context
from src.db.models import tasks as task_models
from src.schemas.tasks import task as task_schemas
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import schedule as schedule_schemas
from src.services.tasks import RunRecordService, TaskService

if TYPE_CHECKING:
    from src.agent.context.models import AgentContextPersistence


class TaskPersistence:
    async def persist(
        self,
        runtime_id: int,
        messages: list[Message],
        usage: task_models.TaskUsage,
    ) -> task_runtime_schemas.TaskRuntimeContext:
        update = task_schemas.TaskUpdate(
            title=None,
            agent_id=None,
            messages=messages,
            usage=usage,
            last_run_at=int(time.time()),
        )
        async with db_context() as db_session:
            task = await TaskService(db_session).update_task(runtime_id, update)
        return task_runtime_schemas.TaskRuntimeContext.model_validate(task)

class SchedulePersistence:
    def __init__(self, agent_id: int | None, workspace_id: int):
        self._agent_id = agent_id
        self._workspace_id = workspace_id

    async def persist(
        self,
        runtime_id: int,
        messages: list[Message],
        usage: task_models.TaskUsage,
    ) -> task_runtime_schemas.TaskRuntimeContext:
        update = schedule_schemas.RunRecordUpdate(
            run_at=None,
            usage=usage,
            messages=messages,
            schedule_id=None,
        )
        async with db_context() as db_session:
            record = await RunRecordService(db_session).update_run_record(runtime_id, update)
        return task_runtime_schemas.TaskRuntimeContext(
            id=record.id,
            type=task_runtime_schemas.TaskType.SCHEDULE,
            usage=record.usage,
            agent_id=self._agent_id,
            workspace_id=self._workspace_id,
            messages=record.messages,
        )

def create_agent_context_persistence(
    task: task_runtime_schemas.TaskRuntimeContext,
) -> AgentContextPersistence:
    match task.type:
        case task_runtime_schemas.TaskType.TASK:
            return TaskPersistence()
        case task_runtime_schemas.TaskType.SCHEDULE:
            return SchedulePersistence(task.agent_id, task.workspace_id)

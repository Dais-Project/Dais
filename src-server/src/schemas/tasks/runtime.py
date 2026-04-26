from enum import StrEnum
from dais_sdk.types import Message
from src.db.models import tasks as task_models
from .. import DTOBase


class TaskType(StrEnum):
    TASK = "task"
    SCHEDULE = "schedule"

    def to_resource_owner_type(self) -> task_models.TaskResourceOwnerType:
        match self:
            case TaskType.TASK: return task_models.TaskResourceOwnerType.TASK
            case TaskType.SCHEDULE: return task_models.TaskResourceOwnerType.RUN_RECORD

class TaskRuntimeContext(DTOBase):
    id: int
    type: TaskType
    usage: task_models.TaskUsage
    agent_id: int | None
    workspace_id: int
    messages: list[Message]

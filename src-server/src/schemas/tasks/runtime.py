from enum import StrEnum
from typing import Self
from dais_sdk.types import Message
from src.db.models import tasks as task_models
from .. import DTOBase


class TaskType(StrEnum):
    TASK = "task"
    SUBTASK = "subtask"
    SCHEDULE = "schedule"

    def to_resource_owner_type(self) -> task_models.TaskResourceOwnerType:
        match self:
            case TaskType.TASK: return task_models.TaskResourceOwnerType.TASK
            case TaskType.SUBTASK: return task_models.TaskResourceOwnerType.SUBTASK
            case TaskType.SCHEDULE: return task_models.TaskResourceOwnerType.RUN_RECORD

class TaskRuntimeContext(DTOBase):
    id: int
    type: TaskType
    usage: task_models.TaskUsage
    agent_id: int | None
    workspace_id: int
    messages: list[Message]

    @classmethod
    def from_task(cls, task: task_models.Task) -> Self:
        return cls(
            id=task.id,
            type=TaskType.TASK,
            usage=task.usage,
            agent_id=task.agent_id,
            workspace_id=task.workspace_id,
            messages=task.messages,
        )

    @classmethod
    def from_subtask(cls, subtask: task_models.Subtask) -> Self:
        return cls(
            id=subtask.id,
            type=TaskType.SUBTASK,
            usage=subtask.usage,
            agent_id=subtask.agent_id,
            workspace_id=subtask.task.workspace_id,
            messages=subtask.messages,
        )

    @classmethod
    def from_schedule_record(cls, record: task_models.RunRecord) -> Self:
        return cls(
            id=record.id,
            type=TaskType.SCHEDULE,
            usage=record.usage,
            agent_id=record.schedule.agent_id,
            workspace_id=record.schedule.workspace_id,
            messages=record.messages,
        )

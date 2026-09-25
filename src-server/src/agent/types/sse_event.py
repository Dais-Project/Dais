from typing import Literal

from pydantic import BaseModel

from src.schemas.tasks import runtime as task_runtime_schemas

from .task_result import StopReason


class ScheduleRunCompletedEvent(BaseModel):
    event_id: Literal["SCHEDULE_RUN_COMPLETED"]
    schedule_id: int
    schedule_name: str
    run_record_id: int
    workspace_id: int
    status: StopReason

class TaskExecutorChangedEvent(BaseModel):
    event_id: Literal["TASK_EXECUTOR_CHANGED"]
    task_type: task_runtime_schemas.TaskType
    task_id: int

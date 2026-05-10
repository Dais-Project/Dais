from typing import Literal
from pydantic import BaseModel
from .task_result import StopReason


class ScheduleRunCompletedEvent(BaseModel):
    event_id: Literal["SCHEDULE_RUN_COMPLETED"]
    schedule_id: int
    schedule_name: str
    run_record_id: int
    workspace_id: int
    status: StopReason

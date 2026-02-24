from enum import Enum
from typing import TypedDict

class DispatcherEvent(str, Enum):
    TASK_TITLE_UPDATED = "task_title_updated"


class TaskTitleUpdatedEvent(TypedDict):
    task_id: int
    title: str

type DispatcherEventData = TaskTitleUpdatedEvent

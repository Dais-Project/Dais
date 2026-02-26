from typing import Literal
from . import DTOBase
from ..db.models.task import TaskMessage, TaskType, TaskUsage

class TaskBase(DTOBase):
    title: str
    type: TaskType
    messages: list[TaskMessage]

class TaskBrief(TaskBase):
    id: int
    usage: TaskUsage
    last_run_at: int
    agent_id: int | None

class TaskRead(TaskBase):
    id: int
    usage: TaskUsage
    last_run_at: int
    agent_id: int | None
    workspace_id: int

class TaskCreate(TaskBase):
    agent_id: int
    workspace_id: int

"""
Note: This schema is backend only type.
"""
class TaskUpdate(DTOBase):
    title: str | None
    usage: TaskUsage | None
    last_run_at: int
    agent_id: int | None
    messages: list[TaskMessage] | None

# --- --- --- --- --- ---

ContextFileItemType = Literal["folder", "file"]

class ContextFileItem(DTOBase):
    path: str
    name: str
    type: ContextFileItemType

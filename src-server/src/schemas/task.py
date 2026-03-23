from typing import Literal
from dais_sdk.types import Message
from src.db.models.task import TaskUsage
from . import DTOBase


class TaskBase(DTOBase):
    title: str
    messages: list[Message]

class TaskBrief(TaskBase):
    id: int
    usage: TaskUsage
    last_run_at: int
    icon_name: str | None
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

class TaskMessageEdit(DTOBase):
    message_id: str
    content: str

"""
Note: This schema is backend only type.
"""
class TaskUpdate(DTOBase):
    title: str | None
    usage: TaskUsage | None
    last_run_at: int
    agent_id: int | None
    messages: list[Message] | None

# --- --- --- --- --- ---

ContextFileItemType = Literal["folder", "file"]

class ContextFileItem(DTOBase):
    path: str
    name: str
    type: ContextFileItemType

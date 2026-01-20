from . import DTOBase
from ..models.task import TaskMessage, TaskType

class TaskBase(DTOBase):
    title: str
    type: TaskType
    messages: list[TaskMessage]

class TaskRead(TaskBase):
    id: int
    last_run_at: int
    agent_id: int | None = None
    workspace_id: int

class TaskCreate(TaskBase):
    agent_id: int
    workspace_id: int

class TaskUpdate(DTOBase):
    title: str | None = None
    last_run_at: int
    agent_id: int | None = None
    messages: list[TaskMessage] | None = None

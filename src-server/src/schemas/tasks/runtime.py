from dais_sdk.types import Message
from src.db.models.task import TaskUsage
from .. import DTOBase


class TaskRuntimeContext(DTOBase):
    id: int
    usage: TaskUsage
    agent_id: int | None
    workspace_id: int
    messages: list[Message]

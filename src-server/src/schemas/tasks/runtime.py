from dais_sdk.types import Message
from src.db.models import tasks as task_models
from .. import DTOBase


class TaskRuntimeContext(DTOBase):
    id: int
    usage: task_models.TaskUsage
    agent_id: int | None
    workspace_id: int
    messages: list[Message]

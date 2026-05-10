from dais_sdk.types import Message
from src.db.models import tasks as task_models
from .. import DTOBase


class SubtaskRead(DTOBase):
    id: int
    usage: task_models.TaskUsage
    messages: list[Message]
    task_id: int
    agent_id: int | None

class SubtaskCreate(DTOBase):
    instruction: str
    task_id: int
    agent_id: int | None

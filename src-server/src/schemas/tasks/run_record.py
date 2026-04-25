from dais_sdk.types import Message
from src.db.models import tasks as task_models
from .. import DTOBase


class RunRecordBase(DTOBase):
    run_at: int
    usage: task_models.TaskUsage
    messages: list[Message]
    schedule_id: int


class RunRecordBrief(RunRecordBase):
    id: int


class RunRecordRead(RunRecordBase):
    id: int

from enum import StrEnum, auto
from typing import Annotated, Literal
from dais_sdk.types import ToolMessage
from pydantic import BaseModel, Discriminator
from .stream import ErrorEvent


class StopReason(StrEnum):
    ERROR = auto()
    INTERRUPTED = auto()
    WAITING_ACTION = auto()
    FINISHED = auto()

class TaskError(BaseModel):
    reason: Literal[StopReason.ERROR] = StopReason.ERROR
    event: ErrorEvent

class TaskInterrupted(BaseModel):
    reason: Literal[StopReason.INTERRUPTED] = StopReason.INTERRUPTED

class TaskWaitingAction(BaseModel):
    reason: Literal[StopReason.WAITING_ACTION] = StopReason.WAITING_ACTION
    messages: list[ToolMessage]

class TaskFinished(BaseModel):
    reason: Literal[StopReason.FINISHED] = StopReason.FINISHED
    summary: str

type TaskStopResult = Annotated[
    TaskError | TaskInterrupted | TaskWaitingAction | TaskFinished,
    Discriminator("reason")
]

__all__ = [
    "TaskError",
    "TaskInterrupted",
    "TaskWaitingAction",
    "TaskFinished",
    "TaskStopResult",
]
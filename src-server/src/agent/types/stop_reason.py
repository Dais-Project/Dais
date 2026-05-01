from enum import StrEnum, auto


class StopReason(StrEnum):
    ERROR = auto()
    INTERRUPTED = auto()
    PENDING_APPROVE = auto()
    COMPLETED = auto()

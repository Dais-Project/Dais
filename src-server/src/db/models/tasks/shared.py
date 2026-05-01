from dataclasses import dataclass
from enum import StrEnum
from typing import Self
from dais_sdk.types import Message
from pydantic import TypeAdapter


messages_adapter = TypeAdapter(list[Message])

class TaskResourceOwnerType(StrEnum):
    TASK = "tasks"
    RUN_RECORD = "run_records"

@dataclass
class TaskUsage:
    input_tokens: int
    output_tokens: int
    total_tokens: int
    max_tokens: int
    accumulated_input_tokens: int = 0
    accumulated_output_tokens: int = 0

    @classmethod
    def default(cls) -> Self:
        return cls(
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            max_tokens=0,
        )

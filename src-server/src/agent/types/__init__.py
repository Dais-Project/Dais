from dataclasses import dataclass
from dais_sdk import UsageChunk
from ...db.models.task import TaskUsage
from .stream import *
from .metadata import *

@dataclass
class ContextUsage(TaskUsage):
    @property
    def remaining_tokens(self) -> int:
        reserved_output = 4096
        safety_margin = int(self.max_tokens * 0.1)
        return self.max_tokens - self.total_tokens - reserved_output - safety_margin

    def set_usage(self, usage: UsageChunk) -> None:
        self.input_tokens = usage.input_tokens
        self.output_tokens = usage.output_tokens
        self.total_tokens = usage.total_tokens

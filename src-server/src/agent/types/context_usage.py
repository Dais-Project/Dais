from dataclasses import dataclass
from dais_sdk.types import UsageChunkEvent
from src.db.models.task import TaskUsage

@dataclass
class ContextUsage(TaskUsage):
    def accumulate(self, usage: UsageChunkEvent) -> None:
        self.input_tokens = usage.input_tokens
        self.output_tokens = usage.output_tokens
        self.total_tokens = usage.total_tokens
        self.accumulated_input_tokens += usage.input_tokens
        self.accumulated_output_tokens += usage.output_tokens

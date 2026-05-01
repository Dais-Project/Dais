from dataclasses import dataclass
from dais_sdk.types import UsageChunkEvent
from src.db.models import tasks as task_models

@dataclass
class ContextUsage(task_models.TaskUsage):
    def accumulate(self, usage: UsageChunkEvent) -> None:
        self.input_tokens = usage.input_tokens
        self.output_tokens = usage.output_tokens
        self.total_tokens = usage.total_tokens
        self.accumulated_input_tokens += usage.input_tokens
        self.accumulated_output_tokens += usage.output_tokens

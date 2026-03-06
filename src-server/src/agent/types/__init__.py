from dataclasses import dataclass
from dais_sdk.types import UsageChunkEvent
from ...db.models.task import TaskUsage
from .stream import *
from .metadata import *

@dataclass
class ContextUsage(TaskUsage):
    def set_usage(self, usage: UsageChunkEvent) -> None:
        self.input_tokens = usage.input_tokens
        self.output_tokens = usage.output_tokens
        self.total_tokens = usage.total_tokens

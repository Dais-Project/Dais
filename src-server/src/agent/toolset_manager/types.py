from abc import ABC
from typing import Sequence, TypedDict
from liteai_sdk import Toolset

class ToolMetadata(TypedDict):
    auto_approve: bool

class ToolsetManager(ABC):
    @property
    def toolsets(self) -> Sequence[Toolset]:
        """Return all toolsets managed by this manager"""
        ...

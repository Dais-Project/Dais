from abc import ABC
from typing import Sequence
from liteai_sdk import Toolset

class ToolsetManager(ABC):
    @property
    def toolsets(self) -> Sequence[Toolset]:
        """Return all toolsets managed by this manager"""
        ...

from typing import Sequence
from liteai_sdk import Toolset
from .types import ToolsetManager
from ..builtin_tools import FileSystemToolset

class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, cwd: str):
        self._file_system_toolset = FileSystemToolset(cwd)

    @property
    def toolsets(self) -> Sequence[Toolset]:
        return [self._file_system_toolset]

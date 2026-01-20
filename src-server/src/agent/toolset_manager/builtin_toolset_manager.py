from typing import Sequence
from dataclasses import replace
from liteai_sdk import Toolset, PythonToolset, python_tool, ToolDef
from .types import ToolsetManager
from ..toolset_manager.types import ToolMetadata
from ..builtin_tools import FileSystemToolset
from ...services import ToolsetService

built_in_tool = python_tool

class BuiltInToolset(PythonToolset):
    def __init__(self) -> None:
        self._tools_cache = super().get_tools(namespaced_tool_name=False)
        with ToolsetService() as toolset_service:
            toolset_ent = toolset_service.get_toolset_by_internal_key(self.internal_key)
            if toolset_ent is None:
                raise ValueError(f"Toolset '{self.internal_key}' not found")
            toolset_ent = toolset_service.sync_toolset(toolset_ent.id,
                                                      [tool.name for tool in self._tools_cache])
        self._toolset_ent_map = {tool.internal_key: tool for tool in toolset_ent.tools}

    @property
    def internal_key(self) -> str:
        return self.__class__.__name__

    def get_tools(self, namespaced_tool_name: bool=True) -> list[ToolDef]:
        result = []
        for tool in self._tools_cache:
            tool_ent = self._toolset_ent_map[tool.name]
            if not tool_ent.is_enabled: continue

            normalized_name = (self.format_tool_name(tool.name)
                               if namespaced_tool_name
                               else tool.name)
            tool_def = replace(tool,
                               name=normalized_name,
                               metadata=ToolMetadata(auto_approve=tool_ent.auto_approve))
            result.append(tool_def)
        return result

class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, cwd: str):
        self._file_system_toolset = FileSystemToolset(cwd)

    @property
    def toolsets(self) -> Sequence[Toolset]:
        return [self._file_system_toolset]

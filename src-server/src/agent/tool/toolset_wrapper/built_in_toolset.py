from dataclasses import replace, dataclass
from pathlib import Path
from typing import override
from dais_sdk import PythonToolset, python_tool, ToolDef
from ..types import ToolMetadata
from ...types import ContextUsage
from ....services import ToolsetService

built_in_tool = python_tool

class BuiltInToolsetContext:
    def __init__(self, cwd: str | Path, usage: ContextUsage):
        self.cwd = self.resolve_cwd(cwd)
        self.usage = usage

    @classmethod
    def default(cls):
        return cls(Path.cwd(), ContextUsage.default())

    @staticmethod
    def resolve_cwd(cwd: str | Path) -> Path:
        """
        Resolve the current working directory.
        If the input is a string, it will be resolved relative to the current working directory.
        If the input is a Path object, it will be resolved as is.
        Returns:
            The absolute path of the current working directory.
        """
        if isinstance(cwd, str):
            if cwd == "~":
                cwd = Path.home()
            else:
                cwd = Path(cwd)
        return cwd.resolve()

class BuiltInToolset(PythonToolset):
    def __init__(self, ctx: BuiltInToolsetContext) -> None:
        self._ctx = ctx
        self._tools_cache = super().get_tools(namespaced_tool_name=False)
        with ToolsetService() as toolset_service:
            toolset_ent = toolset_service.get_toolset_by_internal_key(self.internal_key)
        self._toolset_ent_map = {tool.internal_key: tool for tool in toolset_ent.tools}

    @property
    def internal_key(self) -> str:
        return self.__class__.__name__

    @classmethod
    def sync(cls):
        internal_key = cls.__name__
        temp_instance = cls(BuiltInToolsetContext.default())
        raw_tools = super().get_tools(temp_instance, namespaced_tool_name=False)
        with ToolsetService() as toolset_service:
            toolset_ent = toolset_service.get_toolset_by_internal_key(internal_key)
            toolset_service.sync_toolset(toolset_ent.id,
                                        [ToolsetService.ToolLike(
                                            name=tool.name,
                                            internal_key=tool.name,
                                            description=tool.description)
                                        for tool in raw_tools])

    @override
    def get_tools(self, namespaced_tool_name: bool=True) -> list[ToolDef]:
        result = []
        for tool in self._tools_cache:
            tool_ent = self._toolset_ent_map[tool.name]
            if not tool_ent.is_enabled: continue

            normalized_name = (self.format_tool_name(tool.name)
                               if namespaced_tool_name
                               else tool.name)
            tool_with_metadata = replace(tool,
                                         name=normalized_name,
                                         metadata=ToolMetadata(auto_approve=tool_ent.auto_approve))
            result.append(tool_with_metadata)
        return result

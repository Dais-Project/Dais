from dataclasses import replace
from pathlib import Path
from typing import override, TYPE_CHECKING, TypedDict
from dais_sdk import PythonToolset, python_tool, ToolDef
from ..types import ToolMetadata
from ...types import ContextUsage
from ....db import db_context

if TYPE_CHECKING:
    from ....db.models import toolset as toolset_models

built_in_tool = python_tool

class BuiltInToolDefaults(TypedDict, total=False):
    auto_approve: bool

    # Whether this tool needs user interaction (e.g. ask_user, show_plan)
    needs_user_interaction: bool

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
    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None) -> None:
        self._ctx = ctx
        self._tools_cache = super().get_tools(namespaced_tool_name=False)
        if toolset_ent:
            self._tool_ent_map = {tool.internal_key: tool for tool in toolset_ent.tools}
        else:
            self._tool_ent_map = None

    @classmethod
    def internal_key(cls) -> str:
        return cls.__name__

    @classmethod
    async def sync(cls):
        from ....services import ToolsetService

        temp_instance = cls(BuiltInToolsetContext.default())
        raw_tools = super().get_tools(temp_instance, namespaced_tool_name=False)
        async with db_context() as session:
            toolset_service = ToolsetService(session)
            toolset_ent = await toolset_service.get_toolset_by_internal_key(cls.internal_key())
            await toolset_service.sync_toolset(toolset_ent.id,
                                              [ToolsetService.ToolLike(
                                                  name=tool.name,
                                                  internal_key=tool.name,
                                                  description=tool.description)
                                               for tool in raw_tools])

    def get_original_tools(self, namespaced_tool_name: bool=True) -> list[ToolDef]:
        return super().get_tools(namespaced_tool_name=namespaced_tool_name)

    @override
    def get_tools(self, namespaced_tool_name: bool=True) -> list[ToolDef]:
        if self._tool_ent_map is None:
            raise ValueError("Toolset not initialized")

        result = []
        for tool in self._tools_cache:
            # name of tooldef is the internal_key of the tool entity
            tool_ent = self._tool_ent_map[tool.name]
            if not tool_ent.is_enabled: continue

            normalized_name = (self.format_tool_name(tool.name)
                               if namespaced_tool_name
                               else tool.name)
            tool_with_metadata = replace(tool,
                                         name=normalized_name,
                                         metadata=ToolMetadata(
                                            id=tool_ent.id,
                                            auto_approve=tool_ent.auto_approve))
            result.append(tool_with_metadata)
        return result

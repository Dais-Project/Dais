from dataclasses import replace
from pathlib import Path
from typing import Callable, Self, cast, override, TYPE_CHECKING, TypedDict
from dais_sdk.tool import PythonToolset, python_tool
from dais_sdk.types import ToolDef
from sqlalchemy.ext.asyncio import AsyncSession
from ..types import ToolMetadata
from ...notes import NoteManager
from ...types import ContextUsage

if TYPE_CHECKING:
    from ...context import ToolRuntimeContext
    from ....db.models import toolset as toolset_models


built_in_tool = python_tool

class BuiltInToolDefaults(TypedDict, total=False):
    auto_approve: bool

    # Whether this tool needs user interaction (e.g. ask_user, show_plan)
    needs_user_interaction: bool

class BuiltInToolsetContext:
    def __init__(self, workspace_id: int, cwd: str | Path, runtime_getter: Callable[[], ToolRuntimeContext]):
        self.workspace_id = workspace_id
        self.cwd = Path(cwd).expanduser().resolve()
        self._runtime_getter = runtime_getter

    @property
    def usage(self) -> ContextUsage: return self._runtime_getter().usage

    @property
    def note_manager(self) -> NoteManager: return self._runtime_getter().note_manager

    @classmethod
    def default(cls) -> Self:
        """Create a context for static tool metadata export without runtime state.

        The returned context is only intended for code paths that inspect built-in tool
        definitions, such as tool metadata synchronization. Runtime-only properties like
        usage and note_manager are intentionally unavailable on this instance.
        """
        def runtime_getter():
            raise ValueError("ToolRuntimeContext is unavailable in BuiltInToolsetContext.default()")
        return cls(1, Path.cwd(), runtime_getter)

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
    async def sync(cls, db_session: AsyncSession):
        from src.services.toolset import ToolsetService

        temp_instance = cls(BuiltInToolsetContext.default())
        raw_tools = super().get_tools(temp_instance, namespaced_tool_name=False)
        toolset_service = ToolsetService(db_session)
        toolset_ent = await toolset_service.get_toolset_by_internal_key(cls.internal_key())
        await toolset_service.sync_toolset(toolset_ent.id,
                                            [ToolsetService.ToolLike(
                                                name=tool.name,
                                                internal_key=tool.name,
                                                description=tool.description,
                                                auto_approve=cast(BuiltInToolDefaults, tool.defaults)
                                                                .get("auto_approve", False))
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
            tool_defaults = cast(BuiltInToolDefaults, tool.defaults)
            tool_with_metadata = replace(tool,
                                         name=normalized_name,
                                         metadata=ToolMetadata(
                                            id=tool_ent.id,
                                            auto_approve=tool_ent.auto_approve,
                                            needs_user_interaction=tool_defaults.get("needs_user_interaction", False)))
            result.append(tool_with_metadata)
        return result

import asyncio
from typing import Sequence, override
from dais_sdk.tool import Toolset
from sqlalchemy.ext.asyncio import AsyncSession
from .types import ToolsetManager
from ..toolset_wrapper import BuiltInToolset, BuiltInToolsetContext
from ..builtin_tools import (
    FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset
)
from ...types import ContextUsage
from ....db import db_context
from ....db.models import toolset as toolset_models

class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, cwd: str, usage: ContextUsage):
        self._ctx = BuiltInToolsetContext(cwd, usage)
        self._toolset_map: dict[str, toolset_models.Toolset] | None = None
        self._toolsets: list[BuiltInToolset] | None = None

    async def initialize(self):
        from ....services import ToolsetService

        toolset_types: list[type[BuiltInToolset]] = [FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset]
        async with db_context() as db_session:
            toolset_ents = await ToolsetService(db_session).get_all_built_in_toolsets()
        self._toolset_map = {toolset.internal_key: toolset for toolset in toolset_ents}

        self._toolsets = []
        for toolset_t in toolset_types:
            toolset_ent = self._toolset_map[toolset_t.internal_key()]
            self._toolsets.append(toolset_t(self._ctx, toolset_ent))

    @staticmethod
    async def sync_toolsets(db_session: AsyncSession):
        toolset_types: list[type[BuiltInToolset]] = [
            FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset]
        for toolset_t in toolset_types:
            await toolset_t.sync(db_session)

    @property
    @override
    def toolsets(self) -> Sequence[Toolset]:
        if self._toolsets is None or self._toolset_map is None:
            raise ValueError("Toolset manager not initialized")

        result = []
        for toolset in self._toolsets:
            toolset_ent = self._toolset_map[toolset.internal_key()]
            if not toolset_ent.is_enabled: continue
            result.append(toolset)
        return result

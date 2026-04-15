from typing import Sequence, override
from dais_sdk.tool import Toolset
from sqlalchemy.ext.asyncio import AsyncSession
from src.db import db_context
from src.db.models import toolset as toolset_models
from .types import ToolsetManager
from ..toolset_wrapper import BuiltInToolset, BuiltInToolsetContext
from ..builtin_tools import BUILT_IN_TOOLSETS
from ...types import ContextUsage


class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, workspace_id: int, cwd: str, usage: ContextUsage):
        self._ctx = BuiltInToolsetContext(workspace_id, cwd, usage)
        self._toolset_map: dict[str, toolset_models.Toolset] | None = None
        self._toolsets: list[BuiltInToolset] | None = None

    @classmethod
    def default(cls):
        return cls(1, "~", ContextUsage.default())

    @staticmethod
    async def sync_toolsets(db_session: AsyncSession):
        for toolset_t in BUILT_IN_TOOLSETS:
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

    async def initialize(self):
        from src.services.toolset import ToolsetService

        async with db_context() as db_session:
            toolset_ents = await ToolsetService(db_session).get_all_built_in_toolsets()
        self._toolset_map = {toolset.internal_key: toolset for toolset in toolset_ents}

        self._toolsets = []
        for toolset_t in BUILT_IN_TOOLSETS:
            toolset_ent = self._toolset_map[toolset_t.internal_key()]
            self._toolsets.append(toolset_t(self._ctx, toolset_ent))
        await self._ctx.note_manager.materialize()

    @classmethod
    async def create(cls, workspace_id: int, cwd: str, usage: ContextUsage) -> BuiltinToolsetManager:
        manager = cls(workspace_id, cwd, usage)
        await manager.initialize()
        return manager

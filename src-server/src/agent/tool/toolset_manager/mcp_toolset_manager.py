import asyncio
from enum import Enum
from typing import Sequence, override
from loguru import logger
from dais_sdk.tool import Toolset, McpToolset as SdkMcpToolset
from src.db import db_context, toolset_models
from .types import ToolsetManager
from ..toolset_wrapper import McpToolset, McpToolsetStatus


class McpToolsetManagerNotInitializedError(Exception):
    def __init__(self):
        super().__init__("MCP toolset manager not initialized")

class McpToolsetManagerState(Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"

class McpToolsetManager(ToolsetManager):
    _logger = logger.bind(name="McpToolsetManager")

    def __init__(self):
        self._state = McpToolsetManagerState.DISCONNECTED
        self._toolset_map: dict[int, McpToolset] | None = None

    @property
    @override
    def toolsets(self) -> Sequence[Toolset]:
        if self._toolset_map is None:
            raise McpToolsetManagerNotInitializedError()
        return [toolset
                for toolset in self._toolset_map.values()
                if toolset.status == McpToolsetStatus.CONNECTED]

    async def initialize(self):
        from ....services import ToolsetService

        async with db_context() as db_session:
            toolset_ents = await ToolsetService(db_session).get_all_mcp_toolsets()
        self._toolset_map = {toolset.id: McpToolset(toolset) for toolset in toolset_ents}

    def append(self, inner_toolset: SdkMcpToolset, toolset_ent: toolset_models.Toolset):
        """
        Append a newly connected MCP toolset to the manager.
        """
        if self._toolset_map is None:
            raise McpToolsetManagerNotInitializedError()

        new_toolset = McpToolset(toolset_ent, inner_toolset)
        self._toolset_map[toolset_ent.id] = new_toolset

    async def remove(self, toolset_id: int):
        if self._toolset_map is None:
            raise McpToolsetManagerNotInitializedError()

        toolset = self._toolset_map.pop(toolset_id, None)
        if toolset is None:
            self._logger.warning(f"Toolset {toolset_id} not found, skip disconnecting")
            return

        try:
            await toolset.disconnect()
        except Exception as e:
            self._logger.opt(exception=e).warning(f"Failed to disconnect from MCP server {toolset.name}")

    async def connect_mcp_servers(self):
        if self._toolset_map is None:
            raise ValueError("Toolset manager not initialized")

        if self._state != McpToolsetManagerState.DISCONNECTED: return
        self._state = McpToolsetManagerState.CONNECTING

        toolsets = list(self._toolset_map.values())
        tasks = [toolset.connect() for toolset in toolsets]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for toolset, result in zip(toolsets, results):
            if not isinstance(result, BaseException): continue
            self._logger.exception(f"Failed to connect to MCP server {toolset.name}")
        self._state = McpToolsetManagerState.CONNECTED

    async def disconnect_mcp_servers(self):
        if self._toolset_map is None:
            raise ValueError("Toolset manager not initialized")

        if self._state != McpToolsetManagerState.CONNECTED: return
        self._state = McpToolsetManagerState.DISCONNECTING

        tasks = [toolset.disconnect() for toolset in self._toolset_map.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
        self._state = McpToolsetManagerState.DISCONNECTED

__instance: McpToolsetManager | None = None

def use_mcp_toolset_manager() -> McpToolsetManager:
    global __instance
    if __instance is None:
        __instance = McpToolsetManager()
    return __instance

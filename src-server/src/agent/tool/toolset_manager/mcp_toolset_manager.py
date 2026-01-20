import asyncio
import threading
from typing import Sequence
from loguru import logger
from liteai_sdk import Toolset
from .types import ToolsetManager
from ..toolset_wrapper import McpToolset
from ....services import ToolsetService

_logger = logger.bind(name="McpToolsetManager")

class McpToolsetManager(ToolsetManager):
    def __init__(self):
        self._lock = threading.Lock()
        self._connecting = False
        self._connected = False

        with ToolsetService() as toolset_service:
            toolset_ents = toolset_service.get_all_mcp_toolsets()

        with self._lock:
            self._toolsets: list[McpToolset] = [McpToolset(toolset) for toolset in toolset_ents]

    @property
    def toolsets(self) -> Sequence[Toolset]:
        return self._toolsets

    async def connect_mcp_servers(self):
        with self._lock:
            if self._connected or self._connecting: return
            self._connecting = True

        tasks = [toolset.connect() for toolset in self._toolsets]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for toolset, result in zip(self._toolsets, results):
            if not isinstance(result, BaseException): continue
            _logger.exception(f"Failed to connect to MCP server {toolset.name}")
            toolset.error = result

        with self._lock:
            self._connecting = False
            self._connected = True

    async def disconnect_mcp_servers(self):
        with self._lock:
            if not self._connected or self._connecting: return
            self._connecting = False
            self._connected = False

        tasks = [toolset.disconnect() for toolset in self._toolsets]
        await asyncio.gather(*tasks, return_exceptions=True)

__instance: McpToolsetManager | None = None

def use_mcp_toolset_manager() -> McpToolsetManager:
    global __instance
    if __instance is None:
        __instance = McpToolsetManager()
    return __instance

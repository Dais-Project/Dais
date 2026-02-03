import asyncio
import threading
from typing import Sequence, override
from loguru import logger
from dais_sdk import Toolset
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
            self._toolset_map = {toolset.id: McpToolset(toolset) for toolset in toolset_ents}

    @property
    @override
    def toolsets(self) -> Sequence[Toolset]:
        return list(self._toolset_map.values())

    async def refresh_toolset_metadata(self):
        with ToolsetService() as toolset_service:
            toolset_ents = toolset_service.get_all_mcp_toolsets()
        toolset_connect_tasks = []
        with self._lock:
            for toolset in toolset_ents:
                existing_toolset = self._toolset_map.pop(toolset.id, None)
                if existing_toolset is None:
                    new_toolset = McpToolset(toolset)
                    self._toolset_map[toolset.id] = new_toolset
                    toolset_connect_tasks.append(new_toolset.connect())
                    continue
                existing_toolset.refresh_metadata(toolset.tools)

        results = await asyncio.gather(*toolset_connect_tasks, return_exceptions=True)
        for toolset, result in zip(self._toolset_map.values(), results):
            if not isinstance(result, BaseException): continue
            _logger.exception(f"Failed to connect to MCP server {toolset.name}")
            toolset.error = result

    async def connect_mcp_servers(self):
        with self._lock:
            if self._connected or self._connecting: return
            self._connecting = True

        toolsets_iter = self._toolset_map.values()
        tasks = [toolset.connect() for toolset in toolsets_iter]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for toolset, result in zip(toolsets_iter, results):
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

        tasks = [toolset.disconnect() for toolset in self._toolset_map.values()]
        await asyncio.gather(*tasks, return_exceptions=True)

__instance: McpToolsetManager | None = None

def use_mcp_toolset_manager() -> McpToolsetManager:
    global __instance
    if __instance is None:
        __instance = McpToolsetManager()
    return __instance

import asyncio
import threading
from dataclasses import replace
from enum import Enum
from typing import Sequence, cast
from loguru import logger
from liteai_sdk import (
    Toolset, ToolDef,
    McpToolset, LocalMcpToolset, RemoteMcpToolset,
    LocalServerParams, RemoteServerParams,
)
from .types import ToolsetManager, ToolMetadata
from ...services import ToolsetService
from ...db.models import toolset as toolset_models

_logger = logger.bind(name="McpToolsetManager")

class McpToolsetStatus(str, Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class McpConfigurableToolset(Toolset):
    def __init__(self, toolset_ent: toolset_models.Toolset):
        match toolset_ent.type:
            case toolset_models.ToolsetType.MCP_LOCAL:
                assert isinstance(toolset_ent.params, LocalServerParams)
                inner_toolset = LocalMcpToolset(toolset_ent.name, toolset_ent.params)
            case toolset_models.ToolsetType.MCP_REMOTE:
                assert isinstance(toolset_ent.params, RemoteServerParams)
                inner_toolset = RemoteMcpToolset(toolset_ent.name, toolset_ent.params)
            case _:
                raise ValueError(f"Unsupported toolset type: {toolset_ent.type}")
        self._inner_toolset = inner_toolset
        self._toolset_id = toolset_ent.id
        self._status = McpToolsetStatus.CONNECTING
        self._error: BaseException | None = None
        self._tool_map = {self._inner_toolset.format_tool_name(tool.internal_key): tool
                          for tool in toolset_ent.tools}

    @property
    def name(self) -> str:
        return self._inner_toolset.name

    @property
    def status(self) -> McpToolsetStatus:
        return self._status

    @property
    def error(self) -> BaseException | None:
        return self._error

    @error.setter
    def error(self, error: BaseException):
        self._status = McpToolsetStatus.ERROR
        self._error = error

    async def _merge_tools(self, latest_tool_list: list[ToolDef]) -> list[toolset_models.Tool]:
        def sync_in_thread():
            tool_names = [tool.name for tool in latest_tool_list]
            with ToolsetService() as service:
                return service.sync_toolset(self._toolset_id, tool_names)
        merged_toolset_ent = await asyncio.to_thread(sync_in_thread)
        return merged_toolset_ent.tools

    def get_tools(self) -> list[ToolDef]:
        original_tools = self._inner_toolset.get_tools()
        result = []
        for tool in original_tools:
            tool_ent = self._tool_map.get(tool.name)
            if tool_ent is None: continue
            if not tool_ent.is_enabled: continue
            result.append(replace(tool,
                                  metadata=ToolMetadata(auto_approve=tool_ent.auto_approve)))
        return result

    async def connect(self):
        inner_toolset = cast(McpToolset, self._inner_toolset)
        await inner_toolset.connect()

        latest_tool_list = inner_toolset.get_tools(namespaced_tool_name=False)
        merged_tool_list = await self._merge_tools(latest_tool_list)

        # refresh tool map
        self._tool_map = {self._inner_toolset.format_tool_name(tool.internal_key): tool
                          for tool in merged_tool_list}

        self._status = McpToolsetStatus.CONNECTED

    async def disconnect(self):
        inner_toolset = cast(McpToolset, self._inner_toolset)
        await inner_toolset.disconnect()
        self._status = McpToolsetStatus.DISCONNECTED

# --- --- --- --- --- ---

class McpToolsetManager(ToolsetManager):
    def __init__(self):
        self._lock = threading.Lock()
        self._connecting = False
        self._connected = False

        with ToolsetService() as toolset_service:
            toolset_ents = toolset_service.get_all_mcp_toolsets()

        with self._lock:
            self._toolsets: list[McpConfigurableToolset] = [McpConfigurableToolset(toolset)
                                                            for toolset in toolset_ents]

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

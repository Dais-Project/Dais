from dataclasses import replace
from enum import Enum
from typing import cast, override
from dais_sdk import (
    Toolset, ToolDef,
    McpToolset as SdkMcpToolset, LocalMcpToolset, RemoteMcpToolset,
    LocalServerParams, RemoteServerParams,
)
from ..types import ToolMetadata
from ....db import db_context
from ....db.models import toolset as toolset_models

class McpToolsetStatus(str, Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class McpToolset(Toolset):
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
    @override
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
        from ....services import ToolsetService

        async with db_context() as session:
            toolset_service = ToolsetService(session)
            tools = [ToolsetService.ToolLike(
                        name=tool.name,
                        internal_key=tool.name,
                        description=tool.description)
                     for tool in latest_tool_list]
            merged_toolset_ent = await toolset_service.sync_toolset(self._toolset_id, tools)
        return merged_toolset_ent.tools

    @override
    def get_tools(self) -> list[ToolDef]:
        original_tools = self._inner_toolset.get_tools()
        result = []
        for tool in original_tools:
            tool_ent = self._tool_map.get(tool.name)
            if tool_ent is None: continue
            if not tool_ent.is_enabled: continue
            result.append(replace(tool,
                                  metadata=ToolMetadata(
                                    id=tool_ent.id,
                                    auto_approve=tool_ent.auto_approve)))
        return result

    def refresh_metadata(self, tools: list[toolset_models.Tool]):
        self._tool_map = {self._inner_toolset.format_tool_name(tool.internal_key): tool
                          for tool in tools}

    async def connect(self):
        inner_toolset = cast(SdkMcpToolset, self._inner_toolset)
        await inner_toolset.connect()

        latest_tool_list = inner_toolset.get_tools(namespaced_tool_name=False)
        merged_tool_list = await self._merge_tools(latest_tool_list)

        self.refresh_metadata(merged_tool_list)
        self._status = McpToolsetStatus.CONNECTED

    async def disconnect(self):
        inner_toolset = cast(McpToolset, self._inner_toolset)
        await inner_toolset.disconnect()
        self._status = McpToolsetStatus.DISCONNECTED

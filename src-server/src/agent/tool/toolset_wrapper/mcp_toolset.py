import asyncio
import subprocess
import os
import anyio
import httpx
import mcp
from dataclasses import replace
from enum import Enum
from typing import cast, override
from dais_sdk.mcp_client import LocalServerParams, RemoteServerParams
from dais_sdk.tool import Toolset, McpToolset as SdkMcpToolset, LocalMcpToolset, RemoteMcpToolset
from dais_sdk.types import ToolDef
from loguru import logger
from mcp.client.stdio import get_default_environment
from src.db import db_context
from src.db.models import toolset as toolset_models
from src.common import DATA_DIR
from src.binaries import NPX_PATH, UVX_PATH, NODE_PATH, UV_PATH
from src.shell_config import EMBEDDED_BINARIES_ENV
from ..types import ToolMetadata


MCP_DATA_DIR = DATA_DIR / "mcp-data"
MCP_DATA_DIR.mkdir(parents=True, exist_ok=True)

class McpToolsetNotConnectedError(Exception):
    def __init__(self, toolset_name: str):
        super().__init__(f"MCP toolset '{toolset_name}' not connected")

class McpToolsetStatus(str, Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class McpConnectErrorCode(str, Enum):
    CONNECTION_TIMEOUT = "MCP_CONNECTION_TIMEOUT"

    # remote
    CONNECTION_FAILED = "MCP_CONNECTION_FAILED"
    AUTH_FAILED = "MCP_AUTH_FAILED"
    PROTOCOL_ERROR = "MCP_PROTOCOL_ERROR"

    # local
    COMMAND_NOT_FOUND = "MCP_COMMAND_NOT_FOUND"
    PERMISSION_DENIED = "MCP_PERMISSION_DENIED"
    PROCESS_START_FAILED = "MCP_PROCESS_START_FAILED"
    PROCESS_CRASHED = "MCP_PROCESS_CRASHED"

    @classmethod
    def from_exception(cls, e: Exception) -> McpConnectErrorCode:
        match e:
            case asyncio.TimeoutError():
                return cls.CONNECTION_TIMEOUT
            case httpx.HTTPStatusError() as e if e.response.status_code == 401:
                return cls.AUTH_FAILED
            case mcp.McpError():
                return cls.PROTOCOL_ERROR
            case FileNotFoundError():
                return cls.COMMAND_NOT_FOUND
            case PermissionError():
                return cls.PERMISSION_DENIED
            case subprocess.SubprocessError():
                return cls.PROCESS_START_FAILED
            case BrokenPipeError() | anyio.EndOfStream():
                return cls.PROCESS_CRASHED
            case _:
                return cls.CONNECTION_FAILED

async def mcp_connect_wrapper(toolset: SdkMcpToolset) -> McpConnectErrorCode | None:
    error_code = None
    try:
        await asyncio.wait_for(toolset.connect(), timeout=15)
    except* Exception as eg:
        e = eg.exceptions[0]
        logger.exception(f"MCP server connect error: {type(e).__name__}", exc_info=e)
        error_code = McpConnectErrorCode.from_exception(e)
    return error_code

def resolve_local_mcp_command(command: str) -> str:
    if command == "npx":
        return str(NPX_PATH)
    if command == "uvx":
        return str(UVX_PATH)
    return command

def resolve_local_mcp_env(env: dict[str, str] | None) -> dict[str, str]:
    base_env = get_default_environment()
    prepend = os.pathsep.join([str(NODE_PATH.parent), str(UV_PATH.parent)])

    base_env["PATH"] = prepend + os.pathsep + base_env.get("PATH", "")
    base_env.update(EMBEDDED_BINARIES_ENV)
    if env: base_env.update(env)
    return base_env

class McpToolset(Toolset):
    def __init__(self, toolset_ent: toolset_models.Toolset, inner_toolset: SdkMcpToolset | None = None):
        if not inner_toolset:
            match toolset_ent.type:
                case toolset_models.ToolsetType.MCP_LOCAL:
                    assert isinstance(toolset_ent.params, LocalServerParams)
                    params = toolset_ent.params.model_copy(
                        update={
                            "command": resolve_local_mcp_command(toolset_ent.params.command),
                            "env": resolve_local_mcp_env(toolset_ent.params.env),
                            "cwd": MCP_DATA_DIR,
                        })
                    inner_toolset = LocalMcpToolset(toolset_ent.name, params)
                case toolset_models.ToolsetType.MCP_REMOTE:
                    assert isinstance(toolset_ent.params, RemoteServerParams)
                    inner_toolset = RemoteMcpToolset(toolset_ent.name, toolset_ent.params)
                case _:
                    raise ValueError(f"Unsupported toolset type: {toolset_ent.type}")

        self._inner_toolset = inner_toolset
        self._toolset_id = toolset_ent.id
        self._status = McpToolsetStatus.DISCONNECTED
        self._error: McpConnectErrorCode | None = None
        self._tool_map = {self._inner_toolset.format_tool_name(tool.internal_key): tool
                          for tool in toolset_ent.tools}

        if self._inner_toolset.connected:
            self._status = McpToolsetStatus.CONNECTED

    @property
    @override
    def name(self) -> str:
        return self._inner_toolset.name

    @property
    def id(self) -> int:
        return self._toolset_id

    @property
    def status(self) -> McpToolsetStatus:
        return self._status

    @property
    def error(self) -> McpConnectErrorCode | None:
        return self._error

    async def _merge_tools(self, latest_tool_list: list[ToolDef]) -> list[toolset_models.Tool]:
        from src.services.toolset import ToolsetService

        async with db_context() as db_session:
            toolset_service = ToolsetService(db_session)
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
                                    auto_approve=tool_ent.auto_approve,
                                    needs_user_interaction=False)))
        return result

    async def sync(self):
        if self._status != McpToolsetStatus.CONNECTED:
            raise McpToolsetNotConnectedError(self.name)

        inner_toolset = cast(SdkMcpToolset, self._inner_toolset)
        latest_tool_list = inner_toolset.get_tools(namespaced_tool_name=False)
        merged_tool_list = await self._merge_tools(latest_tool_list)
        self._tool_map = {self._inner_toolset.format_tool_name(tool.internal_key): tool
                          for tool in merged_tool_list}

    async def connect(self):
        inner_toolset = cast(SdkMcpToolset, self._inner_toolset)
        self._status = McpToolsetStatus.CONNECTING
        error_code = await mcp_connect_wrapper(inner_toolset)
        if error_code is None:
            self._status = McpToolsetStatus.CONNECTED
            await self.sync()
        else:
            self._status = McpToolsetStatus.ERROR
            self._error = error_code

    async def disconnect(self):
        inner_toolset = cast(SdkMcpToolset, self._inner_toolset)
        await inner_toolset.disconnect()
        self._status = McpToolsetStatus.DISCONNECTED

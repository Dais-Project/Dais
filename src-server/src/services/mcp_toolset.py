from typing import cast

from dais_sdk.mcp_client import LocalServerParams
from dais_sdk.mcp_client import RemoteServerParams
from dais_sdk.tool import LocalMcpToolset, RemoteMcpToolset

from src.agent.tool import McpToolset
from src.agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from src.agent.tool.toolset_wrapper.mcp_toolset import create_local_server_params
from src.db.models import toolset as toolset_models

from .toolset import ToolsetService, ToolsetNotFoundError


class McpToolsetService:
    def __init__(self, manager: McpToolsetManager):
        self._manager = manager

    @property
    def toolsets(self) -> list[McpToolset]:
        return cast(list[McpToolset], self._manager.toolsets)

    async def connect_toolset(
        self,
        name: str,
        toolset_type: toolset_models.ToolsetType,
        params: LocalServerParams | RemoteServerParams | None,
    ) -> LocalMcpToolset | RemoteMcpToolset:
        toolset = self._create_mcp_toolset_instance(name, toolset_type, params)
        await toolset.connect()
        return toolset

    @staticmethod
    def get_tools(toolset: LocalMcpToolset | RemoteMcpToolset) -> list[ToolsetService.ToolLike]:
        return [
            ToolsetService.ToolLike(
                name=tool.name,
                internal_key=toolset.format_tool_name(tool.name),
                description=tool.description,
            )
            for tool in toolset.get_tools(namespaced_tool_name=False)
        ]

    async def append_toolset(
        self,
        toolset: LocalMcpToolset | RemoteMcpToolset,
        toolset_ent: toolset_models.Toolset,
    ):
        await self._manager.append(toolset, toolset_ent)

    async def replace_toolset(self, toolset_ent: toolset_models.Toolset):
        toolset = await self.connect_toolset(
            toolset_ent.name,
            toolset_ent.type,
            toolset_ent.params,
        )
        await self._manager.remove(toolset_ent.id)
        await self._manager.append(toolset, toolset_ent)

    async def reconnect_toolset(self, toolset_id: int):
        target = next(
            (toolset for toolset in self.toolsets if toolset.id == toolset_id),
            None,
        )
        if target is None:
            raise ToolsetNotFoundError(toolset_id)
        await target.disconnect()
        await target.connect()

    async def remove_toolset(self, toolset_id: int):
        await self._manager.remove(toolset_id)

    @staticmethod
    def _create_mcp_toolset_instance(
        name: str,
        toolset_type: toolset_models.ToolsetType,
        params: LocalServerParams | RemoteServerParams | None,
    ) -> LocalMcpToolset | RemoteMcpToolset:
        if toolset_type == toolset_models.ToolsetType.MCP_LOCAL:
            assert isinstance(params, LocalServerParams)
            return LocalMcpToolset(name, create_local_server_params(params))
        assert isinstance(params, RemoteServerParams)
        return RemoteMcpToolset(name, params)

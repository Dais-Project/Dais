from types import SimpleNamespace

import pytest

from dais_sdk.mcp_client import LocalServerParams

from src.api.routes.toolset import create_toolset
from src.api.routes.toolset import delete_toolset
from src.api.routes.toolset import get_toolsets_brief
from src.api.routes.toolset import update_toolset
from src.db.models import toolset as toolset_models
from src.schemas import toolset as toolset_schemas
from src.services.mcp_toolset import McpToolsetService
from src.services.toolset import ToolsetService


@pytest.mark.service
class TestMcpToolsetService:
    def test_toolsets_returns_manager_toolsets(self, mocker):
        runtime = SimpleNamespace(id=2)
        manager = mocker.Mock()
        manager.toolsets = [runtime]
        service = McpToolsetService(manager)

        assert service.toolsets == [runtime]

    @pytest.mark.asyncio
    async def test_remove_toolset_delegates_to_manager(self, mocker):
        manager = mocker.Mock()
        manager.remove = mocker.AsyncMock()
        service = McpToolsetService(manager)

        await service.remove(42)

        manager.remove.assert_awaited_once_with(42)


@pytest.mark.service
class TestToolsetRouteOrchestration:
    @pytest.mark.asyncio
    async def test_get_toolset_briefs_combines_persistence_and_runtime(
        self,
        mocker,
    ):
        builtin = SimpleNamespace(
            id=1,
            name="Built-in",
            type=toolset_models.ToolsetType.BUILT_IN,
        )
        mcp_entity = SimpleNamespace(
            id=2,
            name="Remote MCP",
            type=toolset_models.ToolsetType.MCP_REMOTE,
        )
        runtime = SimpleNamespace(id=2, status="connected", error=None)
        toolset_service = mocker.Mock(spec=ToolsetService)
        toolset_service.get_all_builtin = mocker.AsyncMock(
            return_value=[builtin]
        )
        toolset_service.get_all_mcp = mocker.AsyncMock(
            return_value=[mcp_entity]
        )
        mcp_toolset_service = mocker.Mock(spec=McpToolsetService)
        mcp_toolset_service.toolsets = [runtime]

        briefs = await get_toolsets_brief(
            toolset_service,
            mcp_toolset_service,
            "mcp",
        )

        assert [(item.id, item.status) for item in briefs] == [
            (1, "connected"),
            (2, "connected"),
        ]
        toolset_service.get_all_builtin.assert_awaited_once_with("mcp")
        toolset_service.get_all_mcp.assert_awaited_once_with("mcp")

    @pytest.mark.asyncio
    async def test_create_toolset_combines_persistence_and_runtime(self, mocker):
        body = toolset_schemas.ToolsetCreate(
            name="Local MCP",
            type=toolset_models.ToolsetType.MCP_LOCAL,
            params=LocalServerParams(command="echo", args=[], env={}),
        )
        runtime = mocker.Mock()
        tools = [SimpleNamespace(name="Tool")]
        created = SimpleNamespace(id=7)
        toolset_service = mocker.Mock(spec=ToolsetService)
        toolset_service.create = mocker.AsyncMock(return_value=created)
        mcp_toolset_service = mocker.Mock(spec=McpToolsetService)
        mcp_toolset_service.connect = mocker.AsyncMock(return_value=runtime)
        mcp_toolset_service.get_tools.return_value = tools
        mcp_toolset_service.append = mocker.AsyncMock()

        result = await create_toolset(
            toolset_service,
            mcp_toolset_service,
            body,
        )

        assert result is created
        mcp_toolset_service.connect.assert_awaited_once_with(
            body.name,
            body.type,
            body.params,
        )
        mcp_toolset_service.get_tools.assert_called_once_with(runtime)
        toolset_service.create.assert_awaited_once_with(body, tools)
        mcp_toolset_service.append.assert_awaited_once_with(runtime, created)

    @pytest.mark.asyncio
    async def test_update_builtin_toolset_skips_runtime_replacement(self, mocker):
        updated = SimpleNamespace(
            id=7,
            type=toolset_models.ToolsetType.BUILT_IN,
        )
        body = toolset_schemas.ToolsetUpdate(
            name=None,
            type=toolset_models.ToolsetType.BUILT_IN,
            params=None,
            is_enabled=None,
            tools=None,
        )
        toolset_service = mocker.Mock(spec=ToolsetService)
        toolset_service.update = mocker.AsyncMock(return_value=updated)
        mcp_toolset_service = mocker.Mock(spec=McpToolsetService)
        mcp_toolset_service.replace = mocker.AsyncMock()

        result = await update_toolset(
            toolset_service,
            mcp_toolset_service,
            7,
            body,
        )

        assert result is updated
        toolset_service.update.assert_awaited_once_with(7, body)
        mcp_toolset_service.replace.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_delete_toolset_deletes_persistence_before_runtime(
        self,
        mocker,
    ):
        calls = []
        toolset_service = mocker.Mock(spec=ToolsetService)
        toolset_service.delete = mocker.AsyncMock(
            side_effect=lambda toolset_id: calls.append(("persistence", toolset_id))
        )
        mcp_toolset_service = mocker.Mock(spec=McpToolsetService)
        mcp_toolset_service.remove = mocker.AsyncMock(
            side_effect=lambda toolset_id: calls.append(("runtime", toolset_id))
        )

        await delete_toolset(toolset_service, mcp_toolset_service, 42)

        assert calls == [("persistence", 42), ("runtime", 42)]

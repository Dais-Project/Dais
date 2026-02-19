from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict
from fastapi import FastAPI
from ..settings import AppSettingManager
from ..agent.tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager

class AppState(TypedDict):
    app_setting_manager: AppSettingManager
    mcp_toolset_manager: McpToolsetManager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    BuiltinToolsetManager.sync_toolsets()
    app_setting_manager = AppSettingManager()
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.connect_mcp_servers()

    try:
        yield AppState(app_setting_manager=app_setting_manager,
                       mcp_toolset_manager=mcp_toolset_manager)
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()

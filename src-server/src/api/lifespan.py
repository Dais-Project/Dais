from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict
from fastapi import FastAPI
from ..settings import use_app_setting_manager
from ..agent.tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager
from ..db import engine as database_engine

class AppState(TypedDict):
    mcp_toolset_manager: McpToolsetManager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    await BuiltinToolsetManager.sync_toolsets()
    app_setting_manager = use_app_setting_manager()
    await app_setting_manager.initialize()
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.initialize()
    await mcp_toolset_manager.connect_mcp_servers()

    try:
        yield AppState(mcp_toolset_manager=mcp_toolset_manager)
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()
        await database_engine.dispose()
        await app_setting_manager.persist()

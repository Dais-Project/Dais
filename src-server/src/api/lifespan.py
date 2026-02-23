from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict
from fastapi import FastAPI
from .sse_dispatcher import SseDispatcher
from ..settings import use_app_setting_manager
from ..agent.tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager
from ..db import engine as database_engine

class AppState(TypedDict):
    sse_dispatcher: SseDispatcher
    mcp_toolset_manager: McpToolsetManager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    sse_dispatcher = SseDispatcher()

    app_setting_manager = use_app_setting_manager()
    await app_setting_manager.initialize()

    await BuiltinToolsetManager.sync_toolsets()
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.initialize()
    await mcp_toolset_manager.connect_mcp_servers()

    try:
        yield AppState(sse_dispatcher=sse_dispatcher,
                       mcp_toolset_manager=mcp_toolset_manager)
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()
        await database_engine.dispose()
        await app_setting_manager.persist()
        await sse_dispatcher.close()

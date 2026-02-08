from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict
from fastapi import FastAPI
from ..agent.tool import use_mcp_toolset_manager
from ..agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager

class AppState(TypedDict):
    mcp_toolset_manager: McpToolsetManager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.connect_mcp_servers()

    try:
        yield AppState(mcp_toolset_manager=mcp_toolset_manager)
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from ..agent.tool import use_mcp_toolset_manager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.connect_mcp_servers()

    try: yield
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()

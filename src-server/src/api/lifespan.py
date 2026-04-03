import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict
from pathlib import Path
from fastapi import FastAPI
from src.settings import use_app_setting_manager
from src.agent.tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager
from src.db import engine as database_engine, db_context
from src.services.workspace import WorkspaceService
from src.services.markdown_cache import MarkdownCacheService
from .sse_dispatcher import SseDispatcher


class AppState(TypedDict):
    sse_dispatcher: SseDispatcher
    mcp_toolset_manager: McpToolsetManager

class LifespanManager:
    def __init__(self):
        self.sse_dispatcher = SseDispatcher()
        self.app_setting_manager = use_app_setting_manager()
        self.mcp_toolset_manager = use_mcp_toolset_manager()
        self._background_tasks: list[asyncio.Task] = []

    async def _init_resources(self):
        await self.app_setting_manager.initialize()
        
        async with db_context() as db_session:
            await BuiltinToolsetManager.sync_toolsets(db_session)
            await self.mcp_toolset_manager.initialize(db_session)

    async def _clear_unused_cache(self):
        async with db_context() as db_session:
            # clear unused markdown cache
            stmt = WorkspaceService(db_session).get_workspaces_query()
            workspaces = (await db_session.scalars(stmt)).all()
            for workspace in workspaces:
                await MarkdownCacheService(db_session, workspace.id, Path(workspace.directory)).clear_unused()

    @asynccontextmanager
    async def __call__(self, app: FastAPI) -> AsyncIterator[AppState]:
        # --- Startup ---
        await self._init_resources()

        self._background_tasks.append(
            asyncio.create_task(self.mcp_toolset_manager.connect_mcp_servers()))
        self._background_tasks.append(
            asyncio.create_task(self._clear_unused_cache()))

        try:
            yield AppState(
                sse_dispatcher=self.sse_dispatcher,
                mcp_toolset_manager=self.mcp_toolset_manager
            )
        finally:
            await self._shutdown()

    async def _shutdown(self):
        for task in self._background_tasks:
            if not task.done():
                task.cancel()

        if self._background_tasks:
            await asyncio.gather(*self._background_tasks, return_exceptions=True)

        await self.mcp_toolset_manager.disconnect_mcp_servers()
        await self.app_setting_manager.persist()
        await self.sse_dispatcher.close()
        await database_engine.dispose()

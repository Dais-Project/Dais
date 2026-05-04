import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Coroutine, TypedDict
from fastapi import FastAPI
from src.agent.skills import SkillMaterializer
from src.agent.notes import NoteMaterializer
from src.agent.task.schedule_runner import init_schedule_runner
from src.agent.tool import BuiltinToolsetManager, McpToolsetManager, use_mcp_toolset_manager
from src.db import engine as database_engine, db_context
from src.services.markdown_cache import MarkdownCacheService
from src.services.workspace import WorkspaceService
from src.settings import use_app_setting_manager
from .sse_dispatcher import SseDispatcher


class AppState(TypedDict):
    sse_dispatcher: SseDispatcher
    mcp_toolset_manager: McpToolsetManager


class BackgroundTaskManager:
    def __init__(self):
        self._tasks: list[asyncio.Task] = []

    def add_task(self, coroutine: Coroutine) -> asyncio.Task:
        task = asyncio.create_task(coroutine)
        self._tasks.append(task)
        return task

    async def shutdown(self) -> None:
        for task in self._tasks:
            if not task.done():
                task.cancel()

        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)

        self._tasks.clear()

class LifespanManager:
    def __init__(self):
        self.sse_dispatcher = SseDispatcher()
        self.schedule_runner = init_schedule_runner(self.sse_dispatcher.send)
        self.app_setting_manager = use_app_setting_manager()
        self.mcp_toolset_manager = use_mcp_toolset_manager()
        self.background_task_manager = BackgroundTaskManager()

    async def _init_resources(self):
        self.background_task_manager.add_task(SkillMaterializer.materialize_all())
        self.background_task_manager.add_task(NoteMaterializer.materialize_all())
        self.background_task_manager.add_task(self.schedule_runner.load_schedules())
        self.background_task_manager.add_task(self._clear_unused_cache())

        await self.app_setting_manager.initialize()

        async with db_context() as db_session:
            await BuiltinToolsetManager.sync_toolsets(db_session)
            await self.mcp_toolset_manager.initialize(db_session)

        self.background_task_manager.add_task(self.mcp_toolset_manager.connect_mcp_servers())

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

        try:
            yield AppState(
                sse_dispatcher=self.sse_dispatcher,
                mcp_toolset_manager=self.mcp_toolset_manager
            )
        finally:
            await self._shutdown()

    async def _shutdown(self):
        await self.schedule_runner.shutdown()
        await self.background_task_manager.shutdown()

        await self.mcp_toolset_manager.disconnect_mcp_servers()
        await self.app_setting_manager.persist()
        await self.sse_dispatcher.close()
        await database_engine.dispose()

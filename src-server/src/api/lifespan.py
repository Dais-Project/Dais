import asyncio
import inspect
from collections.abc import AsyncGenerator, Callable
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from typing import Coroutine, TypedDict
from fastapi import FastAPI
from src.agent.skills import SkillMaterializer
from src.agent.notes import NoteMaterializer
from src.agent.task.schedule_runner import init_schedule_runner
from src.agent.tool import BuiltinToolsetManager, McpToolsetManager, use_mcp_toolset_manager
from src.db import engine as database_engine, db_context
from src.services.markdown_cache import MarkdownCacheService
from src.services.tasks import RunRecordService, TaskService
from src.services.workspace import WorkspaceService
from src.settings import AppSettings, use_app_setting_manager
from .sse_dispatcher import SseDispatcher
from .cleanup import CleanupManager


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

    @asynccontextmanager
    async def __call__(self, app: FastAPI) -> AsyncGenerator[AppState]:
        await self._init_resources()

        try:
            yield AppState(
                sse_dispatcher=self.sse_dispatcher,
                mcp_toolset_manager=self.mcp_toolset_manager
            )
        finally:
            await CleanupManager.cleanup()

    async def _init_resources(self):
        settings = await self.app_setting_manager.initialize()
        self.background_task_manager.add_task(self._cleanup_outdated_task_records(settings))
        self.background_task_manager.add_task(self._clear_unused_cache())
        self.background_task_manager.add_task(self._init_toolsets())

        await asyncio.gather(SkillMaterializer.materialize_all(),
                             NoteMaterializer.materialize_all(),
                             return_exceptions=True)

        # schedule runner loads after materialize calls,
        # prevent the scheduled task runs without skills and notes
        self.background_task_manager.add_task(self.schedule_runner.load_schedules())

        CleanupManager.add_cleanup(self.schedule_runner.shutdown)
        CleanupManager.add_cleanup(self.background_task_manager.shutdown)
        CleanupManager.add_cleanup(self.mcp_toolset_manager.disconnect_mcp_servers)
        CleanupManager.add_cleanup(self.app_setting_manager.persist)
        CleanupManager.add_cleanup(self.sse_dispatcher.close)
        CleanupManager.add_cleanup(database_engine.dispose)

    async def _init_toolsets(self):
        async with db_context() as db_session:
            await BuiltinToolsetManager.sync_toolsets(db_session)
            await self.mcp_toolset_manager.initialize(db_session)
        await self.mcp_toolset_manager.connect_mcp_servers()

    async def _cleanup_outdated_task_records(self, settings: AppSettings):
        async with db_context() as db_session:
            task_service = TaskService(db_session)
            run_record_service = RunRecordService(db_session)
            await task_service.cleanup_outdated_tasks(settings.task_retention_days)
            await run_record_service.cleanup_outdated_run_records(settings.schedule_run_record_retention_days)

    async def _clear_unused_cache(self):
        async with db_context() as db_session:
            # clear unused markdown cache
            stmt = WorkspaceService(db_session).get_workspaces_query()
            workspaces = (await db_session.scalars(stmt)).all()
            for workspace in workspaces:
                await MarkdownCacheService(db_session, workspace.id, Path(workspace.directory)).clear_unused()

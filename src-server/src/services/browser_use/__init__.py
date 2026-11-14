import asyncio
from typing import TYPE_CHECKING

from playwright.async_api import Playwright, async_playwright

from .browser_context import BrowserContextManager
from .session import BrowserUseSession
from .session.tab_manager import TabManager

if TYPE_CHECKING:
    from src.agent.task.runtime_manager import AgentTaskRuntimeKey


class BrowserUse:
    def __init__(self, playwright: Playwright):
        self._playwright = playwright
        self._context_manager = BrowserContextManager(playwright, self._clear_sessions)
        self._sessions: dict[AgentTaskRuntimeKey, BrowserUseSession] = {}
        self._stopped = False

    @classmethod
    async def create(cls):
        return cls(await async_playwright().start())

    def create_session(self, key: AgentTaskRuntimeKey) -> BrowserUseSession:
        if self._stopped:
            raise RuntimeError("BrowserUse has stopped")
        if key in self._sessions:
            return self._sessions[key]

        def on_stopped():
            if self._sessions.get(key) is session:
                self._sessions.pop(key)

        session = BrowserUseSession(
            self._context_manager,
            TabManager(self._context_manager),
            on_stopped,
        )
        self._sessions[key] = session
        return session

    async def _clear_sessions(self):
        sessions = list(self._sessions.values())
        self._sessions.clear()
        await asyncio.gather(*(session.stop() for session in sessions))

    async def stop(self) -> None:
        self._stopped = True
        await self._clear_sessions()
        await self._context_manager.stop()
        await self._playwright.stop()


__instance: BrowserUse | None = None

async def init_browser_use():
    global __instance
    __instance = await BrowserUse.create()
    return __instance

def use_browser():
    if __instance is None:
        raise ValueError("BrowserUse not initialized")
    return __instance

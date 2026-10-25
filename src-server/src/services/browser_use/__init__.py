import asyncio

from playwright.async_api import Playwright, async_playwright

from .browser_context import BrowserContextManager
from .session import BrowserUseSession


class BrowserUse:
    def __init__(self, playwright: Playwright):
        self._playwright = playwright
        self._context_manager = BrowserContextManager(playwright)
        self._sessions: set[BrowserUseSession] = set()
        self._stopped = False

    @classmethod
    async def create(cls):
        return cls(await async_playwright().start())

    def create_session(self) -> BrowserUseSession:
        if self._stopped:
            raise RuntimeError("BrowserUse has stopped")
        session = BrowserUseSession(self._context_manager, lambda: self._sessions.discard(session))
        self._sessions.add(session)
        return session

    async def stop(self) -> None:
        self._stopped = True
        for session in list(self._sessions):
            await session.stop()
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

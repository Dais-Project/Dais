import asyncio
from collections.abc import Awaitable, Callable
from typing import Literal

from playwright.async_api import Playwright, BrowserContext
from loguru import logger
from src.common import DATA_DIR


type BrowserName = Literal["msedge", "chrome"]

class BrowserContextManager:
    _logger = logger.bind(name="BrowserContextManager")

    def __init__(self,
                 playwright: Playwright,
                 on_closed: Callable[[], Awaitable[None]]):
        self._lock = asyncio.Lock()
        self._playwright = playwright
        self._context: BrowserContext | None = None
        self._on_closed = on_closed

    @staticmethod
    async def get_profile_dir(browser_name: str):
        return DATA_DIR / "browser-profiles" / browser_name

    @staticmethod
    async def get_usable_browser(playwright: Playwright) -> BrowserName:
        for channel in ("chrome", "msedge"):
            try:
                browser = await playwright.chromium.launch(
                    channel=channel,
                    headless=True)
                await browser.close()
                return channel
            except Exception:
                BrowserContextManager._logger.error(f"Failed to launch {channel}")
        raise ValueError("No usable browser found")

    async def get_context(self) -> BrowserContext:
        async with self._lock:
            if self._context is None:
                browser_channel = await self.get_usable_browser(self._playwright)
                self._context = await self._playwright.chromium.launch_persistent_context(
                    user_data_dir=await self.get_profile_dir(browser_channel),
                    channel=browser_channel,
                    chromium_sandbox=True,
                    headless=False,
                    no_viewport=True,
                )
                self._context.on("close", self._on_context_closed)
            return self._context

    async def stop(self) -> None:
        async with self._lock:
            context = self._context
            if context is not None:
                await context.close()
                await self._on_context_closed(context)

    async def _on_context_closed(self, context: BrowserContext):
        if self._context is context:
            self._context = None
            await self._on_closed()

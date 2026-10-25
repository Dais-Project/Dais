import uuid
from typing import Self
from collections.abc import Callable

from playwright.async_api import Page

from .tab_manager import TabManager
from .types import ClickButton, ClickModifiers
from ..browser_context import BrowserContextManager


class BrowserUseSession:
    """
    The browser session for single agent use, not concurrent safe.
    """
    def __init__(self,
                 context_manager: BrowserContextManager,
                 tab_manager: TabManager,
                 on_stopped: Callable[[], None]):
        self._id = str(uuid.uuid4())
        self._context_manager = context_manager
        self._tabs_manager = tab_manager
        self._on_stopped = on_stopped
        self._stopped = False

    @classmethod
    async def create(cls,
                     context_manager: BrowserContextManager,
                     on_stopped: Callable[[], None]) -> Self:
        tab_manager = TabManager.create_with_initial_tab(context_manager)
        return cls(context_manager, tab_manager, on_stopped)

    @property
    def tabs(self) -> TabManager:
        return self._tabs_manager

    def _ensure_tab(self) -> Page:
        tab = self.tabs.current_tab
        if tab is None:
            raise ValueError("No current tab, please create a tab first.")
        return tab

    async def navigate(self, url: str):
        self._ensure_tab().goto(url)

    async def snapshot(self,
                       ref: str | None = None,
                       depth: int | None = None,
                       boxes: bool = False) -> str:
        tab = self._ensure_tab()
        locator = tab.get_by_ref(ref) if ref is not None else tab
        return await locator.aria_snapshot(
            mode="ai",
            depth=depth,
            boxes=boxes,
        )

    async def click(self,
                    ref: str,
                    double_click: bool = False,
                    button: ClickButton = "left",
                    modifiers: list[ClickModifiers] = []):
        locator = self._ensure_tab().get_by_ref(ref)
        locator.click(click_count=1 if not double_click else 2,
                      button=button,
                      modifiers=modifiers)

    async def type(self, ref: str, text: str, submit: bool=False):
        locator = self._ensure_tab().get_by_ref(ref)
        locator.type(text=text)
        if submit:
            await locator.press("Enter")

    async def stop(self) -> None:
        self._stopped = True
        self._tabs_manager.stop()
        self._on_stopped()

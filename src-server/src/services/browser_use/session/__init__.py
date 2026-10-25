import uuid
from typing import Self
from collections.abc import Callable

from playwright.async_api import Page

from .form_manager import FormManager
from .keyboard_manager import KeyboardManager
from .mouse_manager import MouseManager
from .navigator import Navigator
from .tab_manager import TabManager
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
        self._mouse_manager = MouseManager(self._ensure_tab)
        self._keyboard_manager = KeyboardManager(self._ensure_tab)
        self._navigator = Navigator(self._ensure_tab)
        self._form_manager = FormManager(self._ensure_tab)
        self._on_stopped = on_stopped
        self._stopped = False

    @classmethod
    async def create(cls,
                     context_manager: BrowserContextManager,
                     on_stopped: Callable[[], None]) -> Self:
        tab_manager = await TabManager.create_with_initial_tab(context_manager)
        return cls(context_manager, tab_manager, on_stopped)

    @property
    def tabs(self) -> TabManager:
        return self._tabs_manager

    @property
    def mouse(self) -> MouseManager:
        return self._mouse_manager

    @property
    def keyboard(self) -> KeyboardManager:
        return self._keyboard_manager

    @property
    def navigator(self) -> Navigator:
        return self._navigator

    @property
    def form(self) -> FormManager:
        return self._form_manager

    def _ensure_tab(self) -> Page:
        tab = self.tabs.current_tab
        if tab is None:
            raise ValueError("No current tab, please create a tab first.")
        return tab

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

    async def stop(self) -> None:
        self._stopped = True
        self._tabs_manager.stop()
        self._on_stopped()

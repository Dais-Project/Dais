from typing import Self
import uuid
from collections.abc import Callable

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

    async def stop(self) -> None:
        self._stopped = True
        self._tabs_manager.stop()
        self._on_stopped()

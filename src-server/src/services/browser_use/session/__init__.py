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
                 on_stopped: Callable[[], None]):
        self._id = str(uuid.uuid4())
        self._context_manager = context_manager
        self._on_stopped = on_stopped
        self._tabs_manager = TabManager(context_manager)
        self._stopped = False

    @property
    def tabs(self) -> TabManager:
        return self._tabs_manager

    async def stop(self) -> None:
        self._stopped = True
        self._tabs_manager.stop()
        self._on_stopped()

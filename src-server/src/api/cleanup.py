import inspect
from contextlib import AsyncExitStack
from collections.abc import Callable


class _CleanupManager:
    def __init__(self) -> None:
        self._exit_stack = AsyncExitStack()

    def add_cleanup(self, fn: Callable, *args, **kwargs):
        async def _cleanup():
            result = fn(*args, **kwargs)
            if inspect.isawaitable(result):
                await result
        self._exit_stack.push_async_callback(_cleanup)

    async def cleanup(self):
        try:
            await self._exit_stack.aclose()
        finally:
            self._exit_stack = AsyncExitStack()

CleanupManager = _CleanupManager()

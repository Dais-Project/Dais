import asyncio
from typing import Callable, Awaitable
from anyio import Path as AnyioPath
from pathlib import Path as StdPath
from loguru import logger
from watchfiles import awatch, Change as ChangeType


type FileChange = tuple[ChangeType, str]
type ChangeHandler = Callable[[list[FileChange]], Awaitable]

WATCHFILES_SENTINEL = ".watchfiles_sentinel"

class DirectoryWatcher:
    _logger = logger.bind(name="DirectoryWatcher")

    def __init__(self, dir: AnyioPath, on_changes: ChangeHandler):
        self._dir = dir
        self._on_changes = on_changes
        self._change_event: asyncio.Event | None = None
        self._stop_event: asyncio.Event | None = None
        self._watch_task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._watch_task is not None:
            await self.stop()

        self._stop_event = asyncio.Event()
        self._change_event = asyncio.Event()
        ready_event = asyncio.Event()

        self._watch_task = asyncio.create_task(
            self._watch_loop(ready_event, self._change_event, self._stop_event))

        # TODO: use the builtin ready_event of awatch after https://github.com/samuelcolvin/watchfiles/pull/356 is merged
        sentinel = self._dir / WATCHFILES_SENTINEL
        await sentinel.write_bytes(b"")
        await sentinel.unlink(missing_ok=True)
        await ready_event.wait()

    async def stop(self) -> None:
        if self._stop_event:
            await self._drain()
            self._stop_event.set()
            self._stop_event = None

        if self._watch_task and not self._watch_task.done():
            try:
                await asyncio.wait_for(self._watch_task, timeout=2.0)
            except asyncio.TimeoutError:
                self._logger.warning("awatch did not exit gracefully, cancelling")
                self._watch_task.cancel()
                try:
                    await self._watch_task
                except asyncio.CancelledError:
                    # since the watch_task is cancelled programatically,
                    # we should ignore CancelledError here
                    pass
            finally:
                self._watch_task = None

    async def _drain(self) -> None:
        """
        Wait until the watcher goes quiet before signalling stop.
        This ensures all the changes generated before `stop` to be handled.
        """
        INITIAL_TIMEOUT_SEC = 0.8
        EXTRA_TIMEOUT_SEC = 0.4

        change_event = self._change_event
        if change_event is None:
            return

        timeout = INITIAL_TIMEOUT_SEC
        while True:
            change_event.clear()
            try:
                await asyncio.wait_for(change_event.wait(), timeout=timeout)
                timeout = EXTRA_TIMEOUT_SEC
            except asyncio.TimeoutError:
                # Quiet for the full window — safe to stop.
                break
        self._change_event = None

    async def _watch_loop(self,
                          ready_event: asyncio.Event,
                          change_event: asyncio.Event,
                          stop_event: asyncio.Event) -> None:
        if not await self._dir.exists():
            self._logger.warning(f"Watching directory does not exist: {self._dir}")
            ready_event.set()
            return

        try:
            async for changes in awatch(
                StdPath(self._dir),
                stop_event=stop_event,
                recursive=True,
                debounce=100,
            ):
                filtered: list[FileChange] = []
                for change_type, path in changes:
                    if WATCHFILES_SENTINEL in path:
                        ready_event.set()
                        continue
                    filtered.append((change_type, path))

                if filtered:
                    change_event.set()
                    await self._on_changes(filtered)

        except asyncio.CancelledError:
            self._logger.debug(f"Watching cancelled: {self._dir}")
            raise
        except Exception:
            self._logger.exception(f"Unexpected error in watcher: {self._dir}")

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
        ready_future = asyncio.get_running_loop().create_future()

        self._watch_task = asyncio.create_task(
            self._watch_loop(ready_future, self._change_event, self._stop_event))

        # TODO: use the builtin ready_event of awatch after https://github.com/samuelcolvin/watchfiles/pull/356 is merged
        sentinel = self._dir / WATCHFILES_SENTINEL
        await asyncio.sleep(0.3)
        await sentinel.write_bytes(b"")
        await asyncio.wait([ready_future, asyncio.create_task(asyncio.sleep(0.3))], return_when=asyncio.FIRST_COMPLETED) 
        await sentinel.unlink(missing_ok=True)
        try:
            await asyncio.wait_for(ready_future, timeout=2)
        except asyncio.TimeoutError:
            # since the watchfiles.awatch starts very fast,
            # sometimes the race condition may trigger this branch,
            # we treat it as ready here.
            self._logger.warning("Failed to detect watchfiles.awatch starting")
            pass

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
                          ready_future: asyncio.Future,
                          change_event: asyncio.Event,
                          stop_event: asyncio.Event) -> None:
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
                        if not ready_future.done():
                            ready_future.set_result(None)
                        continue
                    filtered.append((change_type, path))

                if filtered:
                    change_event.set()
                    await self._on_changes(filtered)

        except asyncio.CancelledError as e:
            self._logger.debug(f"Watching cancelled: {self._dir}")
            if not ready_future.done():
                ready_future.set_exception(e)
            raise
        except FileNotFoundError as e:
            self._logger.warning(f"Watching directory does not exist: {self._dir}")
            if not ready_future.done():
                ready_future.set_exception(e)
        except Exception as e:
            self._logger.exception(f"Unexpected error in watcher: {self._dir}")
            if not ready_future.done():
                ready_future.set_exception(e)

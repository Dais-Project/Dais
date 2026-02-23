import asyncio
from typing import TYPE_CHECKING
from enum import Enum
from collections.abc import AsyncGenerator
from sse_starlette import ServerSentEvent, JSONServerSentEvent
from .types import EmptyServerSentEvent

if TYPE_CHECKING:
    from .routes.task.background_task import TaskTitleUpdatedEvent

class DispatcherEvent(str, Enum):
    TASK_TITLE_UPDATED = "task_title_updated"

type DispatcherEventData = TaskTitleUpdatedEvent

class SseDispatcher:
    def __init__(self):
        self._queue: asyncio.Queue[ServerSentEvent] = asyncio.Queue()
        self._is_running = True

    async def send(self, event: DispatcherEvent, data: DispatcherEventData | None = None):
        if data is None:
            await self._queue.put(EmptyServerSentEvent(event=event.value))
            return
        await self._queue.put(JSONServerSentEvent(event=event.value, data=data))

    async def listen(self) -> AsyncGenerator[ServerSentEvent, None]:
        while self._is_running:
            yield await self._queue.get()
            self._queue.task_done()

    async def close(self):
        self._is_running = False
        await self._queue.join()

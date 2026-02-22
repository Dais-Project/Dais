import asyncio
from enum import Enum
from collections.abc import AsyncGenerator
from typing import Any
from sse_starlette import ServerSentEvent
from .types import EmptyServerSentEvent
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
        await self._queue.put(ServerSentEvent(event=event.value, data=data))

    async def listen(self) -> AsyncGenerator[ServerSentEvent, None]:
        while self._is_running:
            yield await self._queue.get()
            self._queue.task_done()

    async def close(self):
        self._is_running = False
        await self._queue.join()

import asyncio
from collections.abc import AsyncGenerator
from sse_starlette import ServerSentEvent, JSONServerSentEvent
from .types import DispatcherEvent, DispatcherEventData
from ..types import EmptyServerSentEvent

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

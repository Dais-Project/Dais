import asyncio
from collections.abc import AsyncGenerator
from typing import Annotated
from fastapi import Depends, Request
from .types import DispatcherEventData

class SseDispatcher:
    def __init__(self):
        self._queue: asyncio.Queue[DispatcherEventData] = asyncio.Queue()
        self._is_running = True

    async def send(self, data: DispatcherEventData):
        await self._queue.put(data)

    async def listen(self) -> AsyncGenerator[DispatcherEventData, None]:
        while self._is_running:
            yield await self._queue.get()
            self._queue.task_done()

    async def close(self):
        self._is_running = False
        await self._queue.join()

def get_sse_dispatcher(request: Request) -> SseDispatcher:
    return request.state.sse_dispatcher
type SseDispatcherDep = Annotated[SseDispatcher, Depends(get_sse_dispatcher)]

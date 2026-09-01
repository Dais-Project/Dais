import asyncio
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Request

from .types import DispatcherEventData


type SubscriberQueue = asyncio.Queue[DispatcherEventData]

class SseDispatcher:
    def __init__(self):
        self._subscribers: set[SubscriberQueue] = set()
        self._is_running = True

    async def send(self, data: DispatcherEventData):
        if not self._is_running: return

        for queue in self._subscribers.copy():
            await queue.put(data)

    async def listen(self) -> AsyncGenerator[DispatcherEventData, None]:
        if not self._is_running: return

        queue: SubscriberQueue = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            while self._is_running:
                yield await queue.get()
        except asyncio.QueueShutDown:
            return
        finally:
            self._subscribers.discard(queue)

    async def close(self):
        if not self._is_running: return
        self._is_running = False
        for queue in self._subscribers.copy():
            queue.shutdown()

def get_sse_dispatcher(request: Request) -> SseDispatcher:
    return request.state.sse_dispatcher

type SseDispatcherDep = Annotated[SseDispatcher, Depends(get_sse_dispatcher)]

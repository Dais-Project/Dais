import asyncio
from typing import TYPE_CHECKING, Self

from ...types.stream import is_terminal_event

if TYPE_CHECKING:
    from .execution import AgentTaskExecution
    from ...types.stream import AgentEvent


class AgentTaskSubscription:
    def __init__(self, execution: AgentTaskExecution):
        self._queue: asyncio.Queue[AgentEvent] = asyncio.Queue(maxsize=256)
        self._execution = execution
        self._is_terminated = False

    def put_nowait(self, event: AgentEvent):
        self._queue.put_nowait(event)

    def unsubscribe(self):
        self._execution.unsubscribe(self)

    def __aiter__(self) -> Self:
        return self

    async def __anext__(self) -> AgentEvent:
        if self._is_terminated:
            raise StopAsyncIteration

        event = await self._queue.get()
        if is_terminal_event(event):
            self._is_terminated = True
        return event

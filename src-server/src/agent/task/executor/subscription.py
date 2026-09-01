import asyncio
from typing import TYPE_CHECKING, Self

from ...types.stream import is_terminal_event

if TYPE_CHECKING:
    from .execution import AgentTaskExecution, AgentTaskRevisionEvent


class AgentTaskSubscription:
    _subscription_capacity = 1024

    def __init__(self, execution: AgentTaskExecution):
        self._queue: asyncio.Queue[AgentTaskRevisionEvent] = asyncio.Queue(maxsize=self._subscription_capacity)
        self._execution = execution
        self._is_terminated = False

    def put_nowait(self, event: AgentTaskRevisionEvent):
        self._queue.put_nowait(event)

    def unsubscribe(self):
        self._execution.unsubscribe(self)

    def __aiter__(self) -> Self:
        return self

    async def __anext__(self) -> AgentTaskRevisionEvent:
        if self._is_terminated:
            raise StopAsyncIteration

        revision_event = await self._queue.get()
        if is_terminal_event(revision_event.event):
            self._is_terminated = True
        return revision_event

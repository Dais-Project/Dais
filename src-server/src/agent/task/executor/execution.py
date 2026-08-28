import asyncio
from typing import TYPE_CHECKING, Any, Callable

from loguru import logger

from .subscription import AgentTaskSubscription
from ...types.stream import TaskDoneEvent, ErrorEvent, is_terminal_event

if TYPE_CHECKING:
    from .. import AgentTask
    from ...types.stream import AgentEvent


class AgentTaskExecution:
    _logger = logger.bind(name="TaskStreamRoute")

    def __init__(self,
                 task: AgentTask,
                 on_finished: Callable[[], Any]):
        self._task = task
        self._on_finished = on_finished
        self._runner: asyncio.Task | None = None
        self._subscriptions: set[AgentTaskSubscription] = set()

    def start(self):
        if self._runner is not None:
            self._logger.warning("Task execution already started")
            return
        self._runner = asyncio.create_task(self._run())
        self._runner.add_done_callback(lambda _: self._on_finished())

    def subscribe(self) -> AgentTaskSubscription:
        subscription = AgentTaskSubscription(execution=self)
        self._subscriptions.add(subscription)
        return subscription

    def unsubscribe(self, subscription: AgentTaskSubscription):
        self._subscriptions.discard(subscription)

    async def stop(self):
        if self._runner is None or self._runner.done():
            return
        self._runner.cancel()
        await self._runner

    def _yield_event(self, event: AgentEvent):
        for subscription in self._subscriptions:
            try:
                subscription.put_nowait(event)
            except asyncio.QueueFull:
                # TODO: handle queue overflow case
                pass

    async def _run(self):
        pending_terminal_event = None
        try:
            async for event in self._task.run():
                if is_terminal_event(event):
                    pending_terminal_event = event
                    continue
                self._yield_event(event)
        except asyncio.CancelledError:
            await self._task.stop()
            raise
        except Exception as e:
            self._logger.exception("Error in agent stream")
            self._yield_event(ErrorEvent(error=str(e)))
        finally:
            try:
                # ensure task is persisted before yielding terminal event
                await asyncio.shield(self._task.persist())
            except Exception as e:
                self._logger.exception("Failed to persist task state in stream finalization")

        if pending_terminal_event is None:
            self._logger.warning("No terminal event yielded")
            pending_terminal_event = TaskDoneEvent()
        self._yield_event(pending_terminal_event)

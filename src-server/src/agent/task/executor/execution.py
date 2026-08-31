import asyncio
from collections import deque
from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Coroutine

from loguru import logger
from pydantic import BaseModel, ConfigDict

from src.schemas.tasks import runtime as task_runtime_schemas
from .subscription import AgentTaskSubscription
from .. import AgentTask
from ..runtime_manager import AgentTaskRuntimeLease, AgentTaskRuntimeRef, use_agent_task_runtime_manager
from ...types.stream import TurnEndEvent, TaskDoneEvent, TaskInterruptedEvent, ErrorEvent, is_terminal_event

if TYPE_CHECKING:
    from ...types.stream import AgentEvent


class AgentTaskCheckpoint(BaseModel):
    model_config = ConfigDict(frozen=True)

    revision: int
    snapshot: task_runtime_schemas.TaskRuntimeContext

@dataclass(frozen=True)
class AgentTaskRevisionEvent:
    revision: int
    event: AgentEvent

class AgentTaskExecution:
    _logger = logger.bind(name="TaskStreamRoute")
    _history_limit = AgentTaskSubscription._subscription_capacity * 4

    def __init__(self,
                 task: AgentTask,
                 on_finish: Callable[[], Coroutine]):
        self._task = task
        self._on_finish = on_finish

        self._runner: asyncio.Task | None = None
        self._subscriptions: set[AgentTaskSubscription] = set()

        self._revision = 0
        self._checkpoint = AgentTaskCheckpoint(revision=self._revision,
                                        snapshot=self._task.snapshot())
        self._history: deque[AgentTaskRevisionEvent] = deque(maxlen=self._history_limit)

    def start(self):
        if self._runner is not None:
            self._logger.warning("Task execution already started")
            return

        self._checkpoint = AgentTaskCheckpoint(revision=self._revision,
                                                snapshot=self._task.snapshot())
        self._runner = asyncio.create_task(self._run())
        self._runner.add_done_callback(lambda _: asyncio.create_task(self._on_finish()))

    @property
    def checkpoint(self) -> AgentTaskCheckpoint | None:
        return self._checkpoint

    def subscribe(self, after_revision: int | None = None) -> AgentTaskSubscription:
        subscription = AgentTaskSubscription(execution=self)
        if after_revision is not None:
            for revision_event in self._history:
                if revision_event.revision > after_revision:
                    subscription.put_nowait(revision_event)
        self._subscriptions.add(subscription)
        return subscription

    def unsubscribe(self, subscription: AgentTaskSubscription):
        self._subscriptions.discard(subscription)

    async def stop(self):
        runner = self._runner
        if runner is None or runner.done():return

        runner.cancel()
        await asyncio.shield(runner)

    def _yield_event(self, event: AgentEvent):
        self._revision += 1
        revision_event = AgentTaskRevisionEvent(self._revision, event)
        self._history.append(revision_event)

        for subscription in self._subscriptions:
            try:
                subscription.put_nowait(revision_event)
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
                if isinstance(event, TurnEndEvent):
                    self._checkpoint = AgentTaskCheckpoint(
                        revision=self._revision,
                        snapshot=self._task.snapshot(),
                    )
        except asyncio.CancelledError:
            await self._task.stop()
            pending_terminal_event = TaskInterruptedEvent()
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

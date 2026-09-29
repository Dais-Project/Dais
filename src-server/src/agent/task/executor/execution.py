import asyncio
from collections import deque
from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Coroutine

from loguru import logger
from pydantic import BaseModel, ConfigDict

from src.schemas.tasks import runtime as task_runtime_schemas
from .subscription import AgentTaskSubscription
from .. import AgentTask, TaskResultTracker
from ...types import TaskStopResult
from ...types.stream import TurnEndEvent, is_terminal_event

if TYPE_CHECKING:
    from ...types.stream import AgentEvent


type FinishCallback = Callable[[TaskStopResult], Coroutine]

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
                 on_finish: FinishCallback):
        self._task = task
        self._on_finish_callbacks: list[FinishCallback] = [on_finish]

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

    @property
    def checkpoint(self) -> AgentTaskCheckpoint | None:
        return self._checkpoint

    def subscribe(self, after_revision: int | None = None) -> AgentTaskSubscription:
        subscription = AgentTaskSubscription(execution=self)
        if after_revision is not None:
            for revision_event in self._history:
                if revision_event.revision > after_revision:
                    subscription.put_nowait(revision_event)
        if (self._runner is not None and self._runner.done() and self._history and
            is_terminal_event(self._history[-1].event) and
            (after_revision is None or after_revision >= self._history[-1].revision)):
            subscription.put_nowait(self._history[-1])
        self._subscriptions.add(subscription)
        return subscription

    def unsubscribe(self, subscription: AgentTaskSubscription):
        self._subscriptions.discard(subscription)

    def add_finish_callback(self, callback: FinishCallback):
        self._on_finish_callbacks.append(callback)

    def remove_finish_callback(self, callback: FinishCallback):
        self._on_finish_callbacks.remove(callback)

    async def stop(self):
        runner = self._runner
        if runner is None or runner.done():return

        runner.cancel()

        try:
            await asyncio.shield(runner)
        except asyncio.CancelledError:
            current_task = asyncio.current_task()
            is_stop_self_cancelled = (current_task is not None and current_task.cancelling()) or not runner.cancelled()
            if is_stop_self_cancelled:
                raise

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
        result_tracker = TaskResultTracker(self._task)
        try:
            async for event in self._task.run():
                result_tracker.accept(event)
                self._yield_event(event)
                if isinstance(event, TurnEndEvent):
                    self._checkpoint = AgentTaskCheckpoint(
                        revision=self._revision,
                        snapshot=self._task.snapshot(),
                    )
        finally:
            result = result_tracker.finish()
            await asyncio.shield(self._on_finish_handler(result))

    async def _on_finish_handler(self, result: TaskStopResult):
        for callback in self._on_finish_callbacks:
            await callback(result)

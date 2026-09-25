import asyncio
from collections.abc import Callable, Coroutine

from loguru import logger

from src.agent.types import TaskExecutorChangedEvent
from src.schemas.tasks import runtime as task_runtime_schemas

from .execution import AgentTaskExecution, AgentTaskCheckpoint
from .subscription import AgentTaskSubscription
from ..runtime_manager import (
    AgentTaskRuntimeKey,
    AgentTaskRuntimeLease,
    AgentTaskRuntimeRef,
    use_agent_task_runtime_manager,
)


class AgentTaskExecutor:
    _logger = logger.bind(name="AgentTaskExecutor")

    def __init__(self, on_tasks_changed: Callable[[TaskExecutorChangedEvent], Coroutine]):
        self._tasks: dict[AgentTaskRuntimeKey, AgentTaskExecution] = {}
        self._lock = asyncio.Lock()
        self._on_tasks_changed = on_tasks_changed

    async def start(self, ref: AgentTaskRuntimeRef):
        key = AgentTaskRuntimeKey(ref.type, ref.id)
        async with self._lock:
            if key in self._tasks:
                return
            execution = await self._create_execution(ref)
            self._tasks[key] = execution
            execution.start()

        await self._notify_tasks_changed(key)

    async def get_or_subscribe(self,
                               ref: AgentTaskRuntimeRef,
                               after_revision: int | None = None) -> AgentTaskSubscription:
        key = AgentTaskRuntimeKey(ref.type, ref.id)
        created = False

        async with self._lock:
            execution = self._tasks.get(key)
            if execution is None:
                execution = await self._create_execution(ref)
                self._tasks[key] = execution
                created = True

            subscription = execution.subscribe(after_revision)
            if created:
                execution.start()

        if created:
            await self._notify_tasks_changed(key)

        return subscription

    async def _create_execution(self, ref: AgentTaskRuntimeRef) -> AgentTaskExecution:
        key = AgentTaskRuntimeKey(ref.type, ref.id)
        lease = await use_agent_task_runtime_manager().acquire(ref)
        on_finish = lambda: self._finish_execution(key, lease, new_execution)
        new_execution = AgentTaskExecution(lease.task, on_finish)
        return new_execution

    async def _finish_execution(self,
                                key: AgentTaskRuntimeKey,
                                lease: AgentTaskRuntimeLease,
                                execution: AgentTaskExecution):
        is_current: bool
        async with self._lock:
            is_current = self._tasks.get(key) is execution
            try:
                await lease.release()
            finally:
                if is_current:
                    self._tasks.pop(key)

        if is_current:
            await self._notify_tasks_changed(key)

    async def _notify_tasks_changed(self, key: AgentTaskRuntimeKey):
        await self._on_tasks_changed(TaskExecutorChangedEvent(
            event_id="TASK_EXECUTOR_CHANGED",
            task_type=key.type,
            task_id=key.id,
        ))

    async def get_task_ids(self) -> list[int]:
        async with self._lock:
            return [key.id for key in self._tasks if key.type == task_runtime_schemas.TaskType.TASK]

    async def get_checkpoint(self, key: AgentTaskRuntimeKey) -> AgentTaskCheckpoint | None:
        async with self._lock:
            execution = self._tasks.get(key)
            if execution is None: return None
            return execution.checkpoint

    async def stop(self, key: AgentTaskRuntimeKey):
        async with self._lock:
            execution = self._tasks.get(key)

        if execution is not None:
            await execution.stop()

    async def shutdown(self):
        async with self._lock:
            executions = list(self._tasks.values())
            self._tasks.clear()

        await asyncio.gather(*(execution.stop() for execution in executions),
                             return_exceptions=True)

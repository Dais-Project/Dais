import asyncio
from collections.abc import Callable, Coroutine

from loguru import logger

from src.agent.types import TaskExecutorChangedEvent
from src.schemas.tasks import runtime as task_runtime_schemas

from .execution import AgentTaskExecution, AgentTaskCheckpoint
from .subscription import AgentTaskSubscription
from ..runtime_manager import AgentTaskRuntimeLease, AgentTaskRuntimeRef, use_agent_task_runtime_manager


class AgentTaskExecutor:
    _logger = logger.bind(name="AgentTaskExecutor")

    def __init__(self, on_tasks_changed: Callable[[TaskExecutorChangedEvent], Coroutine]):
        self._tasks: dict[int, AgentTaskExecution] = {}
        self._lock = asyncio.Lock()
        self._on_tasks_changed = on_tasks_changed

    async def get_or_subscribe(self,
                               ref: AgentTaskRuntimeRef,
                               after_revision: int | None = None) -> AgentTaskSubscription:
        if ref.type != task_runtime_schemas.TaskType.TASK:
            raise ValueError("Only TASK typed AgentTask is supported to subscribe.")

        created = False

        async with self._lock:
            execution = self._tasks.get(ref.id)
            if execution is None:
                execution = await self._create_execution(ref)
                self._tasks[ref.id] = execution
                created = True

            subscription = execution.subscribe(after_revision)
            execution.start()

        if created:
            await self._notify_tasks_changed(ref.id)

        return subscription

    async def _create_execution(self, ref: AgentTaskRuntimeRef) -> AgentTaskExecution:
        on_finish = lambda: self._finish_execution(ref.id, lease, new_execution)
        lease = await use_agent_task_runtime_manager().acquire(ref)
        new_execution = AgentTaskExecution(lease.task, on_finish)
        return new_execution

    async def _finish_execution(self,
                                task_id: int,
                                lease: AgentTaskRuntimeLease,
                                execution: AgentTaskExecution):
        is_current: bool
        async with self._lock:
            current = self._tasks.get(task_id)
            is_current = current is execution

            try:
                await lease.release()
            finally:
                if is_current:
                    self._tasks.pop(task_id)

        if is_current:
            await self._notify_tasks_changed(task_id)

    async def _notify_tasks_changed(self, task_id: int):
        await self._on_tasks_changed(TaskExecutorChangedEvent(
            event_id="TASK_EXECUTOR_CHANGED",
            task_id=task_id,
        ))

    async def get_task_ids(self) -> list[int]:
        async with self._lock:
            return list(self._tasks.keys())

    async def get_checkpoint(self, task_id: int) -> AgentTaskCheckpoint | None:
        async with self._lock:
            execution = self._tasks.get(task_id)
            if execution is None: return None
            return execution.checkpoint

    async def stop(self, task_id: int):
        async with self._lock:
            execution = self._tasks.get(task_id)

        if execution is not None:
            await execution.stop()

    async def shutdown(self):
        async with self._lock:
            executions = list(self._tasks.values())
            self._tasks.clear()

        await asyncio.gather(*(execution.stop() for execution in executions),
                             return_exceptions=True)

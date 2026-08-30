import asyncio
from collections.abc import Callable, Coroutine

from src.agent.types import TaskExecutorChangedEvent
from src.schemas.tasks import runtime as task_runtime_schemas

from .execution import AgentTaskExecution, AgentTaskCheckpoint
from ..runtime_manager import AgentTaskRuntimeRef


class AgentTaskExecutor:
    def __init__(self, on_tasks_changed: Callable[[TaskExecutorChangedEvent], Coroutine]):
        self._tasks: dict[int, AgentTaskExecution] = {}
        self._lock = asyncio.Lock()
        self._on_tasks_changed = on_tasks_changed

    async def get_or_append(self, ref: AgentTaskRuntimeRef) -> AgentTaskExecution:
        if ref.type != task_runtime_schemas.TaskType.TASK:
            raise ValueError("Only TASK typed AgentTask is supported to append into AgentTaskExecutor")

        async with self._lock:
            existing = self._tasks.get(ref.id)
            if existing is not None: return existing

            new_execution: AgentTaskExecution
            remove = lambda: asyncio.create_task(self._remove(ref.id, new_execution))
            new_execution = AgentTaskExecution(ref, remove)
            self._tasks[ref.id] = new_execution

        await self._notify_tasks_changed(ref.id)
        return new_execution

    async def _remove(self, task_id: int, execution: AgentTaskExecution):
        async with self._lock:
            if self._tasks.get(task_id) is not execution:
                return
            self._tasks.pop(task_id)

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

    async def shutdown(self):
        async with self._lock:
            executions = list(self._tasks.values())
            self._tasks.clear()

        await asyncio.gather(*(execution.stop() for execution in executions),
                             return_exceptions=True)

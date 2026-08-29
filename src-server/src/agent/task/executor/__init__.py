import asyncio
from typing import TYPE_CHECKING

from src.schemas.tasks import runtime as task_runtime_schemas

from .execution import AgentTaskExecution, AgentTaskCheckpoint

if TYPE_CHECKING:
    from .. import AgentTask


class AgentTaskExecutor:
    def __init__(self):
        self._tasks: dict[int, AgentTaskExecution] = {}
        self._lock = asyncio.Lock()

    async def get_or_append(self, task: AgentTask) -> AgentTaskExecution:
        if task._ctx.task_type != task_runtime_schemas.TaskType.TASK:
            raise ValueError("Only TASK typed AgentTask is supported to append into AgentTaskExecutor")

        async with self._lock:
            existing = self._tasks.get(task.id)
            if existing is not None: return existing

            remove = lambda: self._tasks.pop(task.id, None)
            new_execution = AgentTaskExecution(task, remove)
            self._tasks[task.id] = new_execution
            return new_execution

    async def get_task_ids(self) -> list[int]:
        async with self._lock:
            return list(self._tasks.keys())

    async def get_snapshot(self, task_id: int) -> AgentTaskCheckpoint | None:
        async with self._lock:
            execution = self._tasks.get(task_id)
            if execution is None: return None
            return execution.snapshot

    async def shutdown(self):
        async with self._lock:
            executions = list(self._tasks.values())
            self._tasks.clear()

        await asyncio.gather(
            *(execution.stop() for execution in executions),
            return_exceptions=True,
        )

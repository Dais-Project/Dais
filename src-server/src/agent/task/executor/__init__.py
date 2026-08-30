import asyncio
from typing import TYPE_CHECKING

from src.schemas.tasks import runtime as task_runtime_schemas

from .execution import AgentTaskExecution, AgentTaskCheckpoint
from ..runtime_manager import AgentTaskRuntimeRef


class AgentTaskExecutor:
    def __init__(self):
        self._tasks: dict[int, AgentTaskExecution] = {}
        self._lock = asyncio.Lock()

    async def get_or_append(self, ref: AgentTaskRuntimeRef) -> AgentTaskExecution:
        if ref.type != task_runtime_schemas.TaskType.TASK:
            raise ValueError("Only TASK typed AgentTask is supported to append into AgentTaskExecutor")

        async with self._lock:
            existing = self._tasks.get(ref.id)
            if existing is not None: return existing

            remove = lambda: self._tasks.pop(ref.id, None)
            new_execution = AgentTaskExecution(ref, remove)
            self._tasks[ref.id] = new_execution
            return new_execution

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

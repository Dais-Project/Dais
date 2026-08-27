import asyncio
from typing import TYPE_CHECKING

from .execution import AgentTaskExecution
from src.schemas.tasks import runtime as task_runtime_schemas

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

            new_execution = AgentTaskExecution(task, lambda: self._tasks.pop(task.id, None))
            self._tasks[task.id] = new_execution
            return new_execution

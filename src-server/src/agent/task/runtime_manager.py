import asyncio

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.db import db_context
from src.agent.exceptions import AgentTaskRuntimeConflictError
from src.agent.task import AgentTask
from src.agent.context import AgentContext
from src.services.tasks import TaskService, SubtaskService, RunRecordService
from src.schemas.tasks import runtime as task_runtime_schemas


async def _load_task_runtime_context(db_session: AsyncSession,
                                     task_id: int,
                                     agent_id: int | None,
                                     ) -> task_runtime_schemas.TaskRuntimeContext:
    task = await TaskService.from_db_session(db_session).get_by_id(task_id)
    if agent_id is not None: task.agent_id = agent_id
    return task_runtime_schemas.TaskRuntimeContext.from_task(task)

async def _load_subtask_runtime_context(db_session: AsyncSession,
                                        subtask_id: int,
                                        agent_id: int | None,
                                        ) -> task_runtime_schemas.TaskRuntimeContext:
    subtask = await SubtaskService.from_db_session(db_session).get_by_id(subtask_id)
    if agent_id is not None: subtask.agent_id = agent_id
    return task_runtime_schemas.TaskRuntimeContext.from_subtask(subtask)

async def _load_schedule_runtime_context(db_session: AsyncSession,
                                         task_id: int,
                                         agent_id: int | None,
                                         ) -> task_runtime_schemas.TaskRuntimeContext:
    record = await RunRecordService.from_db_session(db_session).get_by_id(task_id)
    if agent_id is not None: record.schedule.agent_id = agent_id
    return task_runtime_schemas.TaskRuntimeContext.from_schedule_record(record)

@dataclass
class AgentTaskRuntimeRef:
    type: task_runtime_schemas.TaskType
    id: int
    agent_id: int | None = None

@dataclass(frozen=True)
class AgentTaskRuntimeKey:
    type: task_runtime_schemas.TaskType
    id: int

    @classmethod
    def from_task(cls, task: AgentTask) -> AgentTaskRuntimeKey:
        return AgentTaskRuntimeKey(task.type, task.id)

class AgentTaskRuntimeLease:
    def __init__(self,
                 manager: AgentTaskRuntimeManager,
                 task: AgentTask):
        self._manager = manager
        self._released = False
        self._release_lock = asyncio.Lock()
        self.task = task

    async def release(self):
        async with self._release_lock:
            if self._released: return
            await self._manager.release(AgentTaskRuntimeKey.from_task(self.task))
            self._released = True

class AgentTaskRuntimeManager:
    def __init__(self):
        self._reserved: set[AgentTaskRuntimeKey] = set()
        self._lock = asyncio.Lock()

    @staticmethod
    async def load_task_runtime_context(db_session: AsyncSession, ref: AgentTaskRuntimeRef) -> task_runtime_schemas.TaskRuntimeContext:
        match ref.type:
            case task_runtime_schemas.TaskType.TASK:
                return await _load_task_runtime_context(db_session, ref.id, ref.agent_id)
            case task_runtime_schemas.TaskType.SUBTASK:
                return await _load_subtask_runtime_context(db_session, ref.id, ref.agent_id)
            case task_runtime_schemas.TaskType.SCHEDULE:
                return await _load_schedule_runtime_context(db_session, ref.id, ref.agent_id)

    async def acquire(self, ref: AgentTaskRuntimeRef) -> AgentTaskRuntimeLease:
        key = AgentTaskRuntimeKey(ref.type, ref.id)

        async with self._lock:
            if key in self._reserved:
                raise AgentTaskRuntimeConflictError(ref.type, ref.id)
            self._reserved.add(key)

        try:
            async with db_context() as db_session:
                runtime_context =\
                    await AgentTaskRuntimeManager.load_task_runtime_context(db_session, ref)
            ctx = await AgentContext.create(runtime_context)
            return AgentTaskRuntimeLease(self, AgentTask(ctx))
        except BaseException:
            await self.release(key)
            raise

    async def release(self, key: AgentTaskRuntimeKey):
        async with self._lock:
            self._reserved.discard(key)

    @asynccontextmanager
    async def reserve(self, ref: AgentTaskRuntimeRef) -> AsyncGenerator[AgentTask]:
        lease = await self.acquire(ref)
        try:
            yield lease.task
        finally:
            await asyncio.shield(lease.release())

__instance: AgentTaskRuntimeManager | None = None

def use_agent_task_runtime_manager() -> AgentTaskRuntimeManager:
    global __instance
    if __instance is None:
        __instance = AgentTaskRuntimeManager()
    return __instance

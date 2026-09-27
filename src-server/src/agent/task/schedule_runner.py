import asyncio
import time
from typing import Callable, Coroutine

from loguru import logger

from src.db import db_context
from src.db.models.tasks.schedule import CronConfig, DelayedConfig, PollingConfig
from src.repositories.tasks.schedule import ScheduleRepository
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import schedule as schedule_schemas
from src.services.tasks import RunRecordService, ScheduleService
from src.utils import Scheduler

from .executor import AgentTaskExecutor, AgentTaskRuntimeRef
from ..types import ScheduleRunCompletedEvent


_logger = logger.bind(name="ScheduleRunner")

type JobCompletedCallback = Callable[[ScheduleRunCompletedEvent], Coroutine]

class ScheduleJob:
    def __init__(
        self,
        schedule: schedule_schemas.ScheduleRead,
        record: schedule_schemas.RunRecordRead,
        on_job_completed: JobCompletedCallback,
    ):
        self.id = record.id
        self.created_at = int(time.time())
        self._schedule = schedule
        self._execution = None
        self._on_job_completed = on_job_completed

    async def start_with_executor(self, executor: AgentTaskExecutor):
        task_ref = AgentTaskRuntimeRef(
            type=task_runtime_schemas.TaskType.SCHEDULE,
            id=self.id,
            agent_id=self._schedule.agent_id,
        )
        self._execution = await executor.start(task_ref)
        self._execution.add_finish_callback(lambda result: self._on_job_completed(ScheduleRunCompletedEvent(
            event_id="SCHEDULE_RUN_COMPLETED",
                run_record_id=self.id,
                schedule_id=self._schedule.id,
                schedule_name=self._schedule.name,
                workspace_id=self._schedule.workspace_id,
                status=result.reason,
        )))

    def snapshot(self) -> schedule_schemas.ScheduleRunningJob:
        return schedule_schemas.ScheduleRunningJob(
            id=self.id,
            name=self._schedule.name,
            created_at=self.created_at,
            workspace_id=self._schedule.workspace_id,
        )

    async def cancel(self):
        if self._execution is None: return
        await self._execution.stop()

class ScheduleJobPool:
    def __init__(self,
                 job_executor: AgentTaskExecutor,
                 on_job_completed: JobCompletedCallback):
        self._pool: dict[int, ScheduleJob] = {}
        self._job_executor = job_executor
        self._on_job_completed = on_job_completed

    async def add(self,
                  schedule: schedule_schemas.ScheduleRead,
                  record: schedule_schemas.RunRecordRead):
        async def job_completed_handler(event: ScheduleRunCompletedEvent):
            self._pool.pop(event.run_record_id, None)
            await self._on_job_completed(event)

        job = ScheduleJob(schedule, record, job_completed_handler)
        self._pool[job.id] = job
        try:
            await job.start_with_executor(self._job_executor)
        except Exception as e:
            _logger.error(f"Error starting schedule job {job.id}: {e}")
            self._pool.pop(job.id, None)

    async def list_snapshots(self) -> list[schedule_schemas.ScheduleRunningJob]:
        return [job.snapshot() for job in self._pool.values()]

    async def cancel(self, job_id: int):
        job = self._pool.pop(job_id, None)

        if job is None:
            _logger.warning(f"Schedule job {job_id} not found")
            return

        try:
            await job.cancel()
        except Exception as e:
            _logger.error(f"Error cancelling schedule job {job_id}: {e}")

    async def shutdown(self):
        jobs = list(self._pool.values())
        self._pool.clear()

        tasks = []
        for job in jobs:
            cancelled_task = job.cancel()
            if cancelled_task is not None:
                tasks.append(cancelled_task)

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

class ScheduleRunner:
    def __init__(self,
                 job_executor: AgentTaskExecutor,
                 on_job_completed: JobCompletedCallback):
        self._scheduler = Scheduler()
        self._task_pool = ScheduleJobPool(job_executor, on_job_completed)

    async def load_schedules(self):
        async with db_context() as db_session:
            schedules = await ScheduleRepository(db_session).get_all()

        for schedule in schedules:
            if schedule.is_enabled:
                await self.append(schedule_schemas.ScheduleRead.model_validate(schedule))
        self._scheduler.start()

    async def trigger(self, schedule_id: int):
        async with db_context() as db_session:
            schedule = await ScheduleService.from_db_session(db_session).get_by_id(schedule_id)
            record = await RunRecordService.from_db_session(db_session).create(
                schedule_schemas.RunRecordCreate(
                    schedule_id=schedule.id,
                    initial_message=schedule.task))
        schedule = schedule_schemas.ScheduleRead.model_validate(schedule)
        record = schedule_schemas.RunRecordRead.model_validate(record)
        await self._task_pool.add(schedule, record)

    async def append(self, schedule: schedule_schemas.ScheduleRead):
        match schedule.config:
            case CronConfig(expression=expression):
                self._scheduler.add_cron_job(schedule.id, self.trigger, expression=expression, schedule_id=schedule.id)
            case PollingConfig(interval_sec=interval_sec):
                self._scheduler.add_polling_job(schedule.id, self.trigger, interval_sec=interval_sec, schedule_id=schedule.id)
            case DelayedConfig(scheduled_at=scheduled_at):
                self._scheduler.add_delayed_job(schedule.id, self.trigger, scheduled_at=scheduled_at, schedule_id=schedule.id)

    async def list_job_snapshots(self) -> list[schedule_schemas.ScheduleRunningJob]:
        return await self._task_pool.list_snapshots()

    def remove(self, schedule_id: int):
        self._scheduler.remove_job(self._scheduler.create_job_id(schedule_id), raise_when_missing=False)

    async def cancel_job(self, job_id: int):
        await self._task_pool.cancel(job_id)

    async def shutdown(self):
        await self._task_pool.shutdown()
        self._scheduler.shutdown()

__instance = None

def init_schedule_runner(job_executor: AgentTaskExecutor,
                         on_job_completed: JobCompletedCallback) -> ScheduleRunner:
    global __instance
    __instance = ScheduleRunner(job_executor, on_job_completed)
    return __instance

def use_schedule_runner() -> ScheduleRunner:
    global __instance
    if __instance is None:
        raise ValueError()
    return __instance

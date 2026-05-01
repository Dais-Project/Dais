import asyncio
import time
from typing import Callable, Coroutine
from loguru import logger
from src.db import db_context
from src.db.models.tasks.schedule import CronConfig, PollingConfig, DelayedConfig
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import schedule as schedule_schemas
from src.services.schedule import RunRecordService, ScheduleService
from src.utils import Scheduler
from . import AgentTask
from ..types import ScheduleRunCompletedEvent
from ..context import AgentContext


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
        self._on_job_completed = on_job_completed
        self._runtime_context = task_runtime_schemas.TaskRuntimeContext(
            id=record.id,
            type=task_runtime_schemas.TaskType.SCHEDULE,
            usage=record.usage,
            agent_id=schedule.agent_id,
            workspace_id=schedule.workspace_id,
            messages=record.messages
        )

    def snapshot(self) -> schedule_schemas.ScheduleRunningJob:
        return schedule_schemas.ScheduleRunningJob(
            id=self.id,
            name=self._schedule.name,
            created_at=self.created_at,
            workspace_id=self._schedule.workspace_id,
        )

    async def run(self):
        ctx = await AgentContext.create(self._runtime_context)
        task = AgentTask(ctx)
        try:
            stop_reason = await task.run_until_done()
            await self._on_job_completed(ScheduleRunCompletedEvent(
                event_id="SCHEDULE_RUN_COMPLETED",
                schedule_id=self._schedule.id,
                schedule_name=self._schedule.name,
                workspace_id=self._schedule.workspace_id,
                run_record_id=self.id,
                status=stop_reason,
            ))
        except asyncio.CancelledError:
            await task.stop()
            raise
        finally:
            await asyncio.shield(task.persist())

class ScheduleJobPool:
    def __init__(self):
        self._pool: dict[int, tuple[ScheduleJob, asyncio.Task]] = {}
        self._lock = asyncio.Lock()

    async def add(self, job: ScheduleJob):
        async with self._lock:
            task = asyncio.create_task(job.run())
            self._pool[job.id] = (job, task)
            task.add_done_callback(lambda _: self._pool.pop(job.id, None))

    async def list_snapshots(self) -> list[schedule_schemas.ScheduleRunningJob]:
        async with self._lock:
            return [job.snapshot() for job, _ in self._pool.values()]

    async def cancel(self, job_id: int):
        async with self._lock:
            item = self._pool.pop(job_id, None)

        if item is None:
            _logger.warning(f"Schedule job {job_id} not found")
            return

        _, task = item

        if not task.done(): task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    async def shutdown(self):
        async with self._lock:
            tasks = [task for _, task in self._pool.values()]
            self._pool.clear()

        for task in tasks:
            if not task.done():
                task.cancel()

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

class ScheduleRunner:
    def __init__(self, on_job_completed: JobCompletedCallback):
        self._scheduler = Scheduler()
        self._task_pool = ScheduleJobPool()
        self._on_job_completed = on_job_completed

    async def load_schedules(self):
        async with db_context() as db_session:
            schedules = await ScheduleService(db_session).get_all_schedules()

        for schedule in schedules:
            if schedule.is_enabled:
                await self.append(schedule_schemas.ScheduleRead.model_validate(schedule))
        self._scheduler.start()

    async def trigger(self, schedule_id: int):
        async with db_context() as db_session:
            schedule = await ScheduleService(db_session).get_schedule_by_id(schedule_id)
            record = await RunRecordService(db_session).create_run_record(
                schedule_schemas.RunRecordCreate(
                    schedule_id=schedule.id,
                    initial_message=schedule.task))
        schedule = schedule_schemas.ScheduleRead.model_validate(schedule)
        record = schedule_schemas.RunRecordRead.model_validate(record)
        job = ScheduleJob(schedule, record, self._on_job_completed)
        await self._task_pool.add(job)

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

def init_schedule_runner(on_job_completed: JobCompletedCallback) -> ScheduleRunner:
    global __instance
    __instance = ScheduleRunner(on_job_completed)
    return __instance

def use_schedule_runner() -> ScheduleRunner:
    global __instance
    if __instance is None:
        raise ValueError()
    return __instance

from src.db import db_context
from src.db.models.tasks.schedule import CronConfig, PollingConfig, DelayedConfig
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import schedule as schedule_schemas
from src.services.schedule import ScheduleService, RunRecordService
from src.utils import Scheduler
from . import AgentTask
from ..context import AgentContext


class ScheduleJob:
    def __init__(self, schedule: schedule_schemas.ScheduleRead):
        self._schedule = schedule

    def _create_runtime_context(self, record: schedule_schemas.RunRecordRead) -> task_runtime_schemas.TaskRuntimeContext:
        return task_runtime_schemas.TaskRuntimeContext(
            id=record.id,
            type=task_runtime_schemas.TaskType.SCHEDULE,
            usage=record.usage,
            agent_id=self._schedule.agent_id,
            workspace_id=self._schedule.workspace_id,
            messages=record.messages
        )

    async def __call__(self):
        async with db_context() as db_session:
            create = schedule_schemas.RunRecordCreate(schedule_id=self._schedule.id)
            created_record = await RunRecordService(db_session).create_run_record(create)

        runtime_context = self._create_runtime_context(schedule_schemas.RunRecordRead.model_validate(created_record))
        ctx = await AgentContext.create(runtime_context)
        task = AgentTask(ctx)

class ScheduleRunner:
    def __init__(self) -> None:
        self._scheduler = Scheduler()

    async def load_schedules(self):
        async with db_context() as db_session:
            schedules = await ScheduleService(db_session).get_all_schedules()

        for schedule in schedules:
            if not schedule.is_enabled:
                continue
            await self.append(schedule.id)

    async def append(self, id: int):
        async with db_context() as db_session:
            schedule = await ScheduleService(db_session).get_schedule_by_id(id)

        job = ScheduleJob(schedule_schemas.ScheduleRead.model_validate(schedule))
        match schedule.config:
            case CronConfig(expression=expression):
                self._scheduler.add_cron_job(schedule.id, job, expression=expression)
            case PollingConfig(interval_sec=interval_sec):
                self._scheduler.add_polling_job(schedule.id, job, interval_sec=interval_sec)
            case DelayedConfig(scheduled_at=scheduled_at):
                self._scheduler.add_delayed_job(schedule.id, job, scheduled_at=scheduled_at)

    async def remove(self, id: int):
        self._scheduler.remove_job(id=self._scheduler.schedule_job_id(id))

from dais_sdk.types import UserMessage
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.models import tasks as task_models
from src.schemas.tasks import schedule as schedule_schemas
from src.schemas.tasks import runtime as task_runtime_schemas
from src.utils.retention import RetentionOption, get_retention_cutoff
from .resource import TaskResourceService
from ..service_base import ServiceBase
from ..exceptions import NotFoundError, ServiceErrorCode


class ScheduleNotFoundError(NotFoundError):
    def __init__(self, schedule_id: int) -> None:
        super().__init__(ServiceErrorCode.SCHEDULE_NOT_FOUND, "Schedule", schedule_id)

class ScheduleService(ServiceBase[task_models.Schedule]):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.Schedule.agent),
            selectinload(task_models.Schedule.workspace),
        ]

    def get_all_schedules_query(self):
        return select(task_models.Schedule).order_by(task_models.Schedule.id.desc())

    def get_schedules_query(self, workspace_id: int):
        return (
            select(task_models.Schedule)
            .where(task_models.Schedule.workspace_id == workspace_id)
            .order_by(task_models.Schedule.id.desc())
        )

    async def get_all_schedules(self) -> list[task_models.Schedule]:
        stmt = self.get_all_schedules_query()
        schedules = await self._db_session.scalars(stmt)
        return list(schedules.all())

    async def get_schedules(self, workspace_id: int) -> list[task_models.Schedule]:
        stmt = self.get_schedules_query(workspace_id)
        schedules = await self._db_session.scalars(stmt)
        return list(schedules.all())

    async def get_schedule_by_id(self, id: int) -> task_models.Schedule:
        schedule = await self._db_session.get(
            task_models.Schedule,
            id,
            options=self.relations(),
        )
        if not schedule:
            raise ScheduleNotFoundError(id)
        return schedule

    async def create_schedule(self, data: schedule_schemas.ScheduleCreate) -> task_models.Schedule:
        new_schedule = task_models.Schedule(
            _workspace_id=data.workspace_id,
            **data.model_dump(exclude={"config", "workspace_id"}),
            config=data.config,
        )

        self._db_session.add(instance=new_schedule)
        new_id = await self.flush_and_expunge(new_schedule)
        return await self.get_schedule_by_id(new_id)

    async def update_schedule(self, id: int, data: schedule_schemas.ScheduleUpdate) -> task_models.Schedule:
        schedule = await self.get_schedule_by_id(id)

        if data.config is not None:
            schedule.config = data.config

        self.apply_fields(schedule, data, exclude={"config"})

        new_id = await self.flush_and_expunge(schedule)
        return await self.get_schedule_by_id(new_id)

    async def delete_schedule(self, id: int) -> None:
        schedule = await self.get_schedule_by_id(id)
        await self._db_session.delete(schedule)
        await self._db_session.flush()


class RunRecordNotFoundError(NotFoundError):
    def __init__(self, run_record_id: int) -> None:
        super().__init__(ServiceErrorCode.RUN_RECORD_NOT_FOUND, "RunRecord", run_record_id)

class RunRecordService(ServiceBase[task_models.RunRecord]):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.RunRecord.schedule),
        ]

    def get_run_records_query(self, schedule_id: int):
        return (
            select(task_models.RunRecord)
            .where(task_models.RunRecord.schedule_id == schedule_id)
            .order_by(task_models.RunRecord.id.desc())
        )

    async def get_run_record_by_id(self, id: int) -> task_models.RunRecord:
        run_record = await self._db_session.get(
            task_models.RunRecord,
            id,
            options=self.relations(),
        )
        if not run_record:
            raise RunRecordNotFoundError(id)
        return run_record

    async def create_run_record(self, data: schedule_schemas.RunRecordCreate) -> task_models.RunRecord:
        new_run_record = task_models.RunRecord(
            messages=[UserMessage(content=data.initial_message)],
            schedule_id=data.schedule_id,
        )

        self._db_session.add(new_run_record)
        new_id = await self.flush_and_expunge(new_run_record)
        return await self.get_run_record_by_id(new_id)

    async def update_run_record(self, id: int, data: schedule_schemas.RunRecordUpdate) -> task_models.RunRecord:
        run_record = await self.get_run_record_by_id(id)

        if data.messages is not None:
            run_record.messages = data.messages

        self.apply_fields(run_record, data, exclude={"messages"})

        new_id = await self.flush_and_expunge(run_record)
        return await self.get_run_record_by_id(new_id)

    async def delete_run_record(self, id: int):
        run_record = await self.get_run_record_by_id(id)
        await self._db_session.delete(run_record)
        await self._db_session.flush()
        await TaskResourceService(self._db_session, task_runtime_schemas.TaskType.SCHEDULE).delete_task_resources(id)

    async def cleanup_outdated_run_records(self, retention: RetentionOption) -> None:
        cutoff = get_retention_cutoff(retention)
        if cutoff is None: return

        stmt = select(task_models.RunRecord.id).where(task_models.RunRecord.run_at < cutoff)
        run_record_ids = (await self._db_session.scalars(stmt)).all()

        for run_record_id in run_record_ids:
            await self.delete_run_record(run_record_id)

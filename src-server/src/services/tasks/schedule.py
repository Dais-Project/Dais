from sqlalchemy import select
from src.db.models import tasks as task_models
from src.schemas.tasks import schedule as schedule_schemas
from src.schemas.tasks import runtime as task_runtime_schemas
from .resource import TaskResourceService
from ..service_base import ServiceBase
from ..exceptions import NotFoundError, ServiceErrorCode
from ..utils import build_load_options, Relations


class ScheduleNotFoundError(NotFoundError):
    def __init__(self, schedule_id: int) -> None:
        super().__init__(ServiceErrorCode.SCHEDULE_NOT_FOUND, "Schedule", schedule_id)

class ScheduleService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [
            task_models.Schedule.agent,
            task_models.Schedule.workspace,
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
            options=build_load_options(self.relations()),
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
        await self._db_session.flush()

        new_schedule = await self.get_schedule_by_id(new_schedule.id)
        return new_schedule

    async def update_schedule(self, id: int, data: schedule_schemas.ScheduleUpdate) -> task_models.Schedule:
        schedule = await self.get_schedule_by_id(id)

        if data.config is not None:
            schedule.config = data.config

        self.apply_fields(schedule, data, exclude={"config"})

        await self._db_session.flush()
        self._db_session.expunge(schedule)

        updated_schedule = await self.get_schedule_by_id(schedule.id)
        return updated_schedule

    async def delete_schedule(self, id: int) -> None:
        schedule = await self.get_schedule_by_id(id)
        await self._db_session.delete(schedule)
        await self._db_session.flush()


class RunRecordNotFoundError(NotFoundError):
    def __init__(self, run_record_id: int) -> None:
        super().__init__(ServiceErrorCode.RUN_RECORD_NOT_FOUND, "RunRecord", run_record_id)

class RunRecordService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [
            task_models.RunRecord.schedule,
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
            options=build_load_options(self.relations()),
        )
        if not run_record:
            raise RunRecordNotFoundError(id)
        return run_record

    async def create_run_record(self, data: schedule_schemas.RunRecordCreate) -> task_models.RunRecord:
        new_run_record = task_models.RunRecord(**data.model_dump())

        self._db_session.add(new_run_record)
        await self._db_session.flush()

        new_run_record = await self.get_run_record_by_id(new_run_record.id)
        return new_run_record

    async def update_run_record(self, id: int, data: schedule_schemas.RunRecordUpdate) -> task_models.RunRecord:
        run_record = await self.get_run_record_by_id(id)

        if data.messages is not None:
            run_record.messages = data.messages

        self.apply_fields(run_record, data, exclude={"messages"})

        await self._db_session.flush()
        self._db_session.expunge(run_record)

        updated_run_record = await self.get_run_record_by_id(run_record.id)
        return updated_run_record

    async def delete_run_record(self, id: int):
        run_record = await self.get_run_record_by_id(id)
        await TaskResourceService(self._db_session, task_runtime_schemas.TaskType.SCHEDULE).delete_task_resources(id)
        await self._db_session.delete(run_record)
        await self._db_session.flush()

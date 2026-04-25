from sqlalchemy import select
from src.db.models import tasks as task_models
from src.schemas.tasks import schedule as schedule_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .utils import build_load_options, Relations


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

    def get_schedules_query(self, workspace_id: int):
        return (
            select(task_models.Schedule)
            .where(task_models.Schedule.workspace_id == workspace_id)
            .order_by(task_models.Schedule.id.desc())
        )

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

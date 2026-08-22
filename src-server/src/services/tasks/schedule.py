from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.repositories.tasks.schedule import RunRecordRepository
from src.repositories.tasks.schedule import ScheduleRepository
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import schedule as schedule_schemas
from src.utils.retention import RetentionOption
from src.utils.retention import get_retention_cutoff

from .resource import TaskResourceService
from ..exceptions import NotFoundError
from ..exceptions import ServiceErrorCode


class ScheduleNotFoundError(NotFoundError):
    def __init__(self, schedule_id: int):
        super().__init__(ServiceErrorCode.SCHEDULE_NOT_FOUND, "Schedule", schedule_id)


class ScheduleService:
    def __init__(self, repository: ScheduleRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> ScheduleService:
        return cls(ScheduleRepository(db_session))

    async def get_page(self, workspace_id: int, query: str | None = None):
        return await self._repository.get_page(workspace_id, query)

    async def get_all(self) -> list[task_models.Schedule]:
        return await self._repository.get_all()

    async def get_by_id(self, schedule_id: int) -> task_models.Schedule:
        schedule = await self._repository.get_by_id(schedule_id)
        if schedule is None:
            raise ScheduleNotFoundError(schedule_id)
        return schedule

    async def create(self, data: schedule_schemas.ScheduleCreate) -> task_models.Schedule:
        from src.agent.task.schedule_runner import use_schedule_runner

        created = await self._repository.create(data)
        await use_schedule_runner().append(
            schedule_schemas.ScheduleRead.model_validate(created)
        )
        return created

    async def update(self,
                              schedule_id: int,
                              data: schedule_schemas.ScheduleUpdate) -> task_models.Schedule:
        from src.agent.task.schedule_runner import use_schedule_runner

        schedule = await self.get_by_id(schedule_id)
        updated = await self._repository.update(schedule, data)
        runner = use_schedule_runner()
        if updated.is_enabled:
            await runner.append(schedule_schemas.ScheduleRead.model_validate(updated))
        else:
            runner.remove(updated.id)
        return updated

    async def delete(self, schedule_id: int):
        from src.agent.task.schedule_runner import use_schedule_runner

        schedule = await self.get_by_id(schedule_id)
        use_schedule_runner().remove(schedule_id)
        await self._repository.delete(schedule)


class RunRecordNotFoundError(NotFoundError):
    def __init__(self, run_record_id: int):
        super().__init__(
            ServiceErrorCode.RUN_RECORD_NOT_FOUND,
            "RunRecord",
            run_record_id,
        )


class RunRecordService:
    def __init__(self,
                 repository: RunRecordRepository,
                 resource_service: TaskResourceService | None = None):
        self._repository = repository
        self._resource_service = resource_service

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> RunRecordService:
        resource_service = TaskResourceService.from_db_session(
            db_session,
            task_runtime_schemas.TaskType.SCHEDULE,
        )
        return cls(RunRecordRepository(db_session), resource_service)

    async def get_page(self, schedule_id: int):
        return await self._repository.get_page(schedule_id)

    async def get_all_page(self):
        return await self._repository.get_all_page()

    async def get_by_id(self, record_id: int) -> task_models.RunRecord:
        record = await self._repository.get_by_id(record_id)
        if record is None:
            raise RunRecordNotFoundError(record_id)
        return record

    async def create(self, data: schedule_schemas.RunRecordCreate) -> task_models.RunRecord:
        return await self._repository.create(data)

    async def update(self,
                                record_id: int,
                                data: schedule_schemas.RunRecordUpdate) -> task_models.RunRecord:
        record = await self.get_by_id(record_id)
        return await self._repository.update(record, data)

    async def delete(self, record_id: int):
        record = await self.get_by_id(record_id)
        await self._repository.delete(record)
        if self._resource_service is not None:
            await self._resource_service.delete_task_resources(record_id)

    async def cleanup_outdated(self, retention: RetentionOption):
        cutoff = get_retention_cutoff(retention)
        if cutoff is None:
            return
        for record_id in await self._repository.get_ids_before(cutoff):
            await self.delete(record_id)

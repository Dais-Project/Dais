from dais_sdk.types import UserMessage
from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import tasks as task_models
from src.db.models import workspace as workspace_models
from src.schemas.tasks import schedule as schedule_schemas

from ..repository_base import RepositoryBase


class ScheduleRepository(RepositoryBase[task_models.Schedule]):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.Schedule.agent),
            selectinload(task_models.Schedule.workspace),
        ]

    def get_query(self, workspace_id: int, query: str | None = None):
        stmt = (
            select(task_models.Schedule)
            .where(task_models.Schedule.workspace_id == workspace_id)
            .order_by(task_models.Schedule.id.desc())
        )
        if query:
            stmt = stmt.where(task_models.Schedule.name.ilike(f"%{query}%"))
        return stmt

    async def get_page(self, workspace_id: int, query: str | None = None):
        return await apaginate(self._db_session, self.get_query(workspace_id, query))

    async def get_all(self) -> list[task_models.Schedule]:
        schedules = await self._db_session.scalars(
            select(task_models.Schedule).order_by(task_models.Schedule.id.desc())
        )
        return list(schedules.all())

    async def get_by_id(self, schedule_id: int) -> task_models.Schedule | None:
        return await self._db_session.get(
            task_models.Schedule,
            schedule_id,
            options=self.relations(),
        )

    async def create(
        self,
        data: schedule_schemas.ScheduleCreate,
    ) -> task_models.Schedule:
        schedule = task_models.Schedule(
            _workspace_id=data.workspace_id,
            **data.model_dump(exclude={"config", "workspace_id"}),
            config=data.config,
        )
        self._db_session.add(schedule)
        schedule_id = await self.flush_and_expunge(schedule)
        created = await self.get_by_id(schedule_id)
        assert created is not None
        return created

    async def update(
        self,
        schedule: task_models.Schedule,
        data: schedule_schemas.ScheduleUpdate,
    ) -> task_models.Schedule:
        if data.config is not None:
            schedule.config = data.config
        self.apply_fields(schedule, data, exclude={"config"})
        schedule_id = await self.flush_and_expunge(schedule)
        updated = await self.get_by_id(schedule_id)
        assert updated is not None
        return updated

    async def delete(self, schedule: task_models.Schedule):
        await self._db_session.delete(schedule)
        await self._db_session.flush()


class RunRecordRepository(RepositoryBase[task_models.RunRecord]):
    @staticmethod
    def relations():
        return [selectinload(task_models.RunRecord.schedule)]

    async def get_page(self, schedule_id: int):
        stmt = (
            select(task_models.RunRecord)
            .where(task_models.RunRecord.schedule_id == schedule_id)
            .order_by(task_models.RunRecord.id.desc())
        )
        return await apaginate(self._db_session, stmt)

    async def get_all_page(self):
        stmt = (
            select(task_models.RunRecord)
            .order_by(
                task_models.RunRecord.run_at.desc(),
                task_models.RunRecord.id.desc(),
            )
            .add_columns(
                task_models.Schedule.name,
                task_models.Schedule._workspace_id,
                workspace_models.Workspace.name,
            )
            .outerjoin(task_models.RunRecord.schedule)
            .outerjoin(
                workspace_models.Workspace,
                task_models.Schedule._workspace_id == workspace_models.Workspace.id,
            )
        )
        return await apaginate(
            self._db_session,
            stmt,
            transformer=self._transform_all_page,
        )

    async def get_by_id(self, record_id: int) -> task_models.RunRecord | None:
        return await self._db_session.get(
            task_models.RunRecord,
            record_id,
            options=self.relations(),
        )

    async def create(
        self,
        data: schedule_schemas.RunRecordCreate,
    ) -> task_models.RunRecord:
        record = task_models.RunRecord(
            messages=[UserMessage(content=data.initial_message)],
            schedule_id=data.schedule_id,
        )
        self._db_session.add(record)
        record_id = await self.flush_and_expunge(record)
        created = await self.get_by_id(record_id)
        assert created is not None
        return created

    async def update(
        self,
        record: task_models.RunRecord,
        data: schedule_schemas.RunRecordUpdate,
    ) -> task_models.RunRecord:
        if data.messages is not None:
            record.messages = data.messages
        self.apply_fields(record, data, exclude={"messages"})
        record_id = await self.flush_and_expunge(record)
        updated = await self.get_by_id(record_id)
        assert updated is not None
        return updated

    async def delete(self, record: task_models.RunRecord):
        await self._db_session.delete(record)
        await self._db_session.flush()

    async def get_ids_before(self, cutoff: int) -> list[int]:
        ids = await self._db_session.scalars(
            select(task_models.RunRecord.id).where(
                task_models.RunRecord.run_at < cutoff
            )
        )
        return list(ids.all())

    @staticmethod
    def _transform_all_page(rows):
        return [
            schedule_schemas.RunRecordAllBrief.model_validate(
                {
                    **record.__dict__,
                    "schedule_name": schedule_name,
                    "workspace_id": workspace_id,
                    "workspace_name": workspace_name,
                }
            )
            for record, schedule_name, workspace_id, workspace_name in rows
        ]

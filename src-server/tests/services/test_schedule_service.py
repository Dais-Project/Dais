import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import CronConfig, DelayedConfig, PollingConfig
from src.schemas.tasks import schedule as schedule_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.schedule import ScheduleNotFoundError, ScheduleService


@pytest.fixture
def schedule_service(db_session: AsyncSession) -> ScheduleService:
    return ScheduleService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestScheduleService:
    @pytest.mark.asyncio
    async def test_get_schedule_by_id_not_found(self, schedule_service: ScheduleService):
        with pytest.raises(ScheduleNotFoundError, match="Schedule '999' not found") as exc_info:
            await schedule_service.get_schedule_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.SCHEDULE_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_schedule(
        self,
        schedule_service: ScheduleService,
        workspace_factory,
        agent_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        agent = await agent_factory(name="Agent A")

        schedule = await schedule_service.create_schedule(
            schedule_schemas.ScheduleCreate(
                name="Morning sync",
                config=CronConfig(type="cron", expression="0 9 * * 1"),
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )

        assert schedule.name == "Morning sync"
        assert schedule.workspace_id == workspace.id
        assert schedule.agent_id == agent.id
        assert schedule.config.type == "cron"
        assert schedule.config.expression == "0 9 * * 1"

    @pytest.mark.asyncio
    async def test_get_schedules_query_orders_by_id_desc(
        self,
        schedule_service: ScheduleService,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")

        first = await schedule_service.create_schedule(
            schedule_schemas.ScheduleCreate(
                name="First",
                config=PollingConfig(type="polling", interval_sec=60),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )
        second = await schedule_service.create_schedule(
            schedule_schemas.ScheduleCreate(
                name="Second",
                config=DelayedConfig(type="delayed", run_at=123456),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )

        rows = await schedule_service._db_session.scalars(
            schedule_service.get_schedules_query(workspace.id)
        )
        schedules = list(rows.all())

        assert [item.id for item in schedules] == [second.id, first.id]

    @pytest.mark.asyncio
    async def test_update_schedule(
        self,
        schedule_service: ScheduleService,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        created = await schedule_service.create_schedule(
            schedule_schemas.ScheduleCreate(
                name="Original",
                config=PollingConfig(type="polling", interval_sec=30),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )

        updated = await schedule_service.update_schedule(
            created.id,
            schedule_schemas.ScheduleUpdate(
                name="Updated",
                config=CronConfig(type="cron", expression="*/10 * * * *"),
                agent_id=None,
            ),
        )

        assert updated.id == created.id
        assert updated.name == "Updated"
        assert updated.config.type == "cron"
        assert updated.config.expression == "*/10 * * * *"

    @pytest.mark.asyncio
    async def test_delete_schedule(
        self,
        schedule_service: ScheduleService,
        db_session: AsyncSession,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        schedule = await schedule_service.create_schedule(
            schedule_schemas.ScheduleCreate(
                name="To delete",
                config=DelayedConfig(type="delayed", run_at=999999),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )

        await schedule_service.delete_schedule(schedule.id)
        await db_session.flush()

        with pytest.raises(ScheduleNotFoundError, match=f"Schedule '{schedule.id}' not found"):
            await schedule_service.get_schedule_by_id(schedule.id)

        schedule_in_db = await db_session.scalar(
            select(task_models.Schedule).where(task_models.Schedule.id == schedule.id)
        )
        assert schedule_in_db is None

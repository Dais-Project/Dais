import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import PollingConfig
from src.repositories.tasks.schedule import RunRecordRepository
from src.repositories.tasks.schedule import ScheduleRepository
from src.schemas.tasks import schedule as schedule_schemas


@pytest.fixture
def schedule_repository(db_session: AsyncSession) -> ScheduleRepository:
    return ScheduleRepository(db_session)


@pytest.fixture
def run_record_repository(db_session: AsyncSession) -> RunRecordRepository:
    return RunRecordRepository(db_session)


@pytest.mark.integration
class TestScheduleRepository:
    @pytest.mark.asyncio
    async def test_get_query_filters_and_orders_schedules(
        self,
        schedule_repository: ScheduleRepository,
        db_session: AsyncSession,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        first = await schedule_repository.create(
            schedule_schemas.ScheduleCreate(
                name="Morning Sync",
                task="First",
                config=PollingConfig(type="polling", interval_sec=60),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )
        second = await schedule_repository.create(
            schedule_schemas.ScheduleCreate(
                name="Morning Report",
                task="Second",
                config=PollingConfig(type="polling", interval_sec=120),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )

        rows = await db_session.scalars(
            schedule_repository.get_query(workspace.id, "morning")
        )

        assert [schedule.id for schedule in rows.all()] == [second.id, first.id]

    @pytest.mark.asyncio
    async def test_update_and_delete_schedule(
        self,
        schedule_repository: ScheduleRepository,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        created = await schedule_repository.create(
            schedule_schemas.ScheduleCreate(
                name="Schedule A",
                task="Task A",
                config=PollingConfig(type="polling", interval_sec=60),
                agent_id=None,
                workspace_id=workspace.id,
            )
        )
        updated = await schedule_repository.update(
            created,
            schedule_schemas.ScheduleUpdate(
                name="Schedule B",
                task="Task B",
                is_enabled=False,
                config=PollingConfig(type="polling", interval_sec=120),
                agent_id=None,
            ),
        )

        assert updated.name == "Schedule B"
        assert updated.is_enabled is False

        await schedule_repository.delete(updated)

        assert await schedule_repository.get_by_id(updated.id) is None


@pytest.mark.integration
class TestRunRecordRepository:
    @pytest.mark.asyncio
    async def test_get_page_query_order_and_expired_ids(
        self,
        run_record_repository: RunRecordRepository,
        db_session: AsyncSession,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        schedule = task_models.Schedule(
            name="Schedule A",
            task="Task A",
            is_enabled=True,
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        await db_session.flush()
        expired = task_models.RunRecord(schedule_id=schedule.id, run_at=100)
        retained = task_models.RunRecord(schedule_id=schedule.id, run_at=300)
        db_session.add_all([expired, retained])
        await db_session.flush()

        ids = await run_record_repository.get_ids_before(200)

        assert ids == [expired.id]

    @pytest.mark.asyncio
    async def test_create_update_and_delete_run_record(
        self,
        run_record_repository: RunRecordRepository,
        db_session: AsyncSession,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        schedule = task_models.Schedule(
            name="Schedule A",
            task="Task A",
            is_enabled=True,
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        await db_session.flush()

        created = await run_record_repository.create(
            schedule_schemas.RunRecordCreate(
                schedule_id=schedule.id,
                initial_message="Run",
            )
        )
        updated = await run_record_repository.update(
            created,
            schedule_schemas.RunRecordUpdate(
                run_at=200,
                usage=None,
                messages=None,
                schedule_id=None,
            ),
        )

        assert updated.run_at == 200

        await run_record_repository.delete(updated)

        assert await run_record_repository.get_by_id(updated.id) is None

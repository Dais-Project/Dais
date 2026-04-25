import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import PollingConfig
from src.services.exceptions import ServiceErrorCode
from src.services.schedule import RunRecordNotFoundError, RunRecordService


@pytest.fixture
def run_record_service(db_session: AsyncSession) -> RunRecordService:
    return RunRecordService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestRunRecordService:
    @pytest.mark.asyncio
    async def test_get_run_record_by_id_not_found(self, run_record_service: RunRecordService):
        with pytest.raises(RunRecordNotFoundError, match="RunRecord '999' not found") as exc_info:
            await run_record_service.get_run_record_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.RUN_RECORD_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_run_record_by_id(
        self,
        run_record_service: RunRecordService,
        workspace_factory,
        db_session: AsyncSession,
    ):
        workspace = await workspace_factory(name="Workspace A")

        schedule = task_models.Schedule(
            name="Every minute",
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        await db_session.flush()

        run_record = task_models.RunRecord(
            schedule_id=schedule.id,
        )
        db_session.add(run_record)
        await db_session.flush()

        loaded = await run_record_service.get_run_record_by_id(run_record.id)

        assert loaded.id == run_record.id
        assert loaded.schedule_id == schedule.id

    @pytest.mark.asyncio
    async def test_get_run_records_query_filters_by_schedule(
        self,
        run_record_service: RunRecordService,
        workspace_factory,
        db_session: AsyncSession,
    ):
        workspace = await workspace_factory(name="Workspace A")

        schedule_a = task_models.Schedule(
            name="Schedule A",
            config=PollingConfig(type="polling", interval_sec=30),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        schedule_b = task_models.Schedule(
            name="Schedule B",
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add_all([schedule_a, schedule_b])
        await db_session.flush()

        record_a1 = task_models.RunRecord(schedule_id=schedule_a.id)
        record_a2 = task_models.RunRecord(schedule_id=schedule_a.id)
        record_b1 = task_models.RunRecord(schedule_id=schedule_b.id)
        db_session.add_all([record_a1, record_a2, record_b1])
        await db_session.flush()

        rows = await run_record_service._db_session.scalars(
            run_record_service.get_run_records_query(schedule_a.id)
        )
        records = list(rows.all())

        assert [item.schedule_id for item in records] == [schedule_a.id, schedule_a.id]
        assert [item.id for item in records] == [record_a2.id, record_a1.id]

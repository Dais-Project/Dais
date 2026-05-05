from pathlib import Path
import time

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import PollingConfig
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.tasks import RunRecordNotFoundError, RunRecordService, TaskResourceService


@pytest.fixture
def run_record_service(db_session: AsyncSession) -> RunRecordService:
    return RunRecordService(db_session)


@pytest.fixture
def run_record_resource_service(db_session: AsyncSession) -> TaskResourceService:
    return TaskResourceService(db_session, task_runtime_schemas.TaskType.SCHEDULE)


@pytest.fixture
def run_record_resource_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path / "task-data"
    monkeypatch.setattr("src.services.tasks.resource.DATA_DIR", data_dir)
    return data_dir


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
            task="Check every minute",
            is_enabled=True,
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
            task="Task A",
            is_enabled=True,
            config=PollingConfig(type="polling", interval_sec=30),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        schedule_b = task_models.Schedule(
            name="Schedule B",
            task="Task B",
            is_enabled=True,
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

    @pytest.mark.asyncio
    async def test_cleanup_outdated_run_records_removes_only_older_records_and_resources(
        self,
        run_record_service: RunRecordService,
        run_record_resource_service: TaskResourceService,
        run_record_resource_data_dir: Path,
        workspace_factory,
        db_session: AsyncSession,
    ):
        workspace = await workspace_factory(name="Workspace A")
        now = int(time.time())

        schedule = task_models.Schedule(
            name="Schedule A",
            task="Task A",
            is_enabled=True,
            config=PollingConfig(type="polling", interval_sec=30),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        await db_session.flush()

        expired_record = task_models.RunRecord(
            schedule_id=schedule.id,
            run_at=now - 31 * 24 * 60 * 60,
        )
        retained_record = task_models.RunRecord(
            schedule_id=schedule.id,
            run_at=now - 29 * 24 * 60 * 60,
        )
        db_session.add_all([expired_record, retained_record])
        await db_session.flush()

        expired_resource = await run_record_resource_service.save_task_resource(
            expired_record.id,
            "expired.txt",
            b"expired-resource",
        )
        retained_resource = await run_record_resource_service.save_task_resource(
            retained_record.id,
            "retained.txt",
            b"retained-resource",
        )
        expired_resource_dir = (
            run_record_resource_data_dir
            / ".task-resources"
            / "schedule"
            / str(expired_record.id)
        )
        retained_resource_dir = (
            run_record_resource_data_dir
            / ".task-resources"
            / "schedule"
            / str(retained_record.id)
        )

        assert expired_resource_dir.exists()
        assert retained_resource_dir.exists()

        await run_record_service.cleanup_outdated_run_records(30)
        await db_session.flush()

        with pytest.raises(
            RunRecordNotFoundError,
            match=f"RunRecord '{expired_record.id}' not found",
        ):
            await run_record_service.get_run_record_by_id(expired_record.id)

        retained = await run_record_service.get_run_record_by_id(retained_record.id)
        assert retained.id == retained_record.id

        expired_record_in_db = await db_session.get(task_models.RunRecord, expired_record.id)
        retained_record_in_db = await db_session.get(task_models.RunRecord, retained_record.id)
        expired_resource_in_db = await db_session.get(task_models.TaskResource, expired_resource.id)
        retained_resource_in_db = await db_session.get(task_models.TaskResource, retained_resource.id)

        assert expired_record_in_db is None
        assert retained_record_in_db is not None
        assert expired_resource_in_db is None
        assert retained_resource_in_db is not None
        assert not expired_resource_dir.exists()
        assert retained_resource_dir.exists()

    @pytest.mark.asyncio
    async def test_delete_run_record_removes_entity_and_resources(
        self,
        run_record_service: RunRecordService,
        run_record_resource_service: TaskResourceService,
        run_record_resource_data_dir: Path,
        workspace_factory,
        db_session: AsyncSession,
    ):
        workspace = await workspace_factory(name="Workspace A")

        schedule = task_models.Schedule(
            name="Schedule A",
            task="Task A",
            is_enabled=True,
            config=PollingConfig(type="polling", interval_sec=30),
            agent_id=None,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        await db_session.flush()

        run_record = task_models.RunRecord(schedule_id=schedule.id)
        db_session.add(run_record)
        await db_session.flush()

        resource = await run_record_resource_service.save_task_resource(
            run_record.id,
            "note.txt",
            b"resource-bytes",
        )
        resource_dir = (
            run_record_resource_data_dir
            / ".task-resources"
            / "run_records"
            / str(run_record.id)
        )

        await run_record_service.delete_run_record(run_record.id)
        await db_session.flush()

        with pytest.raises(
            RunRecordNotFoundError,
            match=f"RunRecord '{run_record.id}' not found",
        ):
            await run_record_service.get_run_record_by_id(run_record.id)

        run_record_in_db = await db_session.get(task_models.RunRecord, run_record.id)
        resource_in_db = await db_session.get(task_models.TaskResource, resource.id)

        assert run_record_in_db is None
        assert resource_in_db is None
        assert not resource_dir.exists()

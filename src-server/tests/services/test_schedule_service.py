import pytest

from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import PollingConfig
from src.repositories.tasks.schedule import ScheduleRepository
from src.schemas.tasks import schedule as schedule_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.tasks import ScheduleNotFoundError
from src.services.tasks import ScheduleService


def build_schedule(*, is_enabled: bool = True) -> task_models.Schedule:
    return task_models.Schedule(
        id=1,
        name="Schedule A",
        task="Run task",
        is_enabled=is_enabled,
        config=PollingConfig(type="polling", interval_sec=60),
        agent_id=None,
        _workspace_id=1,
    )


@pytest.mark.service
class TestScheduleService:
    @pytest.mark.asyncio
    async def test_get_schedule_by_id_not_found(self, mocker):
        repository = mocker.Mock(spec=ScheduleRepository)
        repository.get_by_id = mocker.AsyncMock(return_value=None)
        service = ScheduleService(repository)

        with pytest.raises(
            ScheduleNotFoundError,
            match="Schedule '999' not found",
        ) as exc_info:
            await service.get_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.SCHEDULE_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_schedule_appends_to_runner(self, mocker):
        data = schedule_schemas.ScheduleCreate(
            name="Schedule A",
            task="Run task",
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            workspace_id=1,
        )
        created = build_schedule()
        repository = mocker.Mock(spec=ScheduleRepository)
        repository.create = mocker.AsyncMock(return_value=created)
        runner = mocker.Mock()
        runner.append = mocker.AsyncMock()
        mocker.patch(
            "src.agent.task.schedule_runner.use_schedule_runner",
            return_value=runner,
        )
        service = ScheduleService(repository)

        result = await service.create(data)

        assert result is created
        repository.create.assert_awaited_once_with(data)
        runner.append.assert_awaited_once_with(
            schedule_schemas.ScheduleRead.model_validate(created)
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_enabled", [True, False])
    async def test_update_schedule_syncs_runner(self, mocker, is_enabled: bool):
        data = schedule_schemas.ScheduleUpdate(
            name=None,
            task=None,
            is_enabled=is_enabled,
            config=None,
            agent_id=None,
        )
        existing = build_schedule()
        updated = build_schedule(is_enabled=is_enabled)
        repository = mocker.Mock(spec=ScheduleRepository)
        repository.get_by_id = mocker.AsyncMock(return_value=existing)
        repository.update = mocker.AsyncMock(return_value=updated)
        runner = mocker.Mock()
        runner.append = mocker.AsyncMock()
        mocker.patch(
            "src.agent.task.schedule_runner.use_schedule_runner",
            return_value=runner,
        )
        service = ScheduleService(repository)

        result = await service.update(existing.id, data)

        assert result is updated
        repository.update.assert_awaited_once_with(existing, data)
        if is_enabled:
            runner.append.assert_awaited_once_with(
                schedule_schemas.ScheduleRead.model_validate(updated)
            )
            runner.remove.assert_not_called()
        else:
            runner.append.assert_not_awaited()
            runner.remove.assert_called_once_with(updated.id)

    @pytest.mark.asyncio
    async def test_delete_schedule_removes_from_runner(self, mocker):
        schedule = build_schedule()
        repository = mocker.Mock(spec=ScheduleRepository)
        repository.get_by_id = mocker.AsyncMock(return_value=schedule)
        repository.delete = mocker.AsyncMock()
        runner = mocker.Mock()
        mocker.patch(
            "src.agent.task.schedule_runner.use_schedule_runner",
            return_value=runner,
        )
        service = ScheduleService(repository)

        await service.delete(schedule.id)

        runner.remove.assert_called_once_with(schedule.id)
        repository.delete.assert_awaited_once_with(schedule)

    @pytest.mark.asyncio
    async def test_create_schedule_propagates_runner_error(self, mocker):
        data = schedule_schemas.ScheduleCreate(
            name="Schedule A",
            task="Run task",
            config=PollingConfig(type="polling", interval_sec=60),
            agent_id=None,
            workspace_id=1,
        )
        created = build_schedule()
        repository = mocker.Mock(spec=ScheduleRepository)
        repository.create = mocker.AsyncMock(return_value=created)
        runner = mocker.Mock()
        runner.append = mocker.AsyncMock(side_effect=RuntimeError("runner failed"))
        mocker.patch(
            "src.agent.task.schedule_runner.use_schedule_runner",
            return_value=runner,
        )
        service = ScheduleService(repository)

        with pytest.raises(RuntimeError, match="runner failed"):
            await service.create(data)

        repository.create.assert_awaited_once_with(data)

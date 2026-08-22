import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.repositories.tasks.resource import TaskResourceRepository


@pytest.fixture
def task_resource_repository(
    db_session: AsyncSession,
) -> TaskResourceRepository:
    return TaskResourceRepository(db_session)


@pytest.mark.integration
class TestTaskResourceRepository:
    @pytest.mark.asyncio
    async def test_create_and_get_resource_by_owner_and_checksum(
        self,
        task_resource_repository: TaskResourceRepository,
    ):
        created = await task_resource_repository.create(
            owner_type=task_models.TaskResourceOwnerType.TASK,
            owner_id=10,
            filename="note.txt",
            checksum="checksum",
        )

        by_id = await task_resource_repository.get_by_id_and_owner(
            created.id,
            task_models.TaskResourceOwnerType.TASK,
            10,
        )
        by_checksum = await task_resource_repository.get_by_checksum_and_owner(
            "checksum",
            task_models.TaskResourceOwnerType.TASK,
            10,
        )
        wrong_owner = await task_resource_repository.get_by_id_and_owner(
            created.id,
            task_models.TaskResourceOwnerType.TASK,
            11,
        )

        assert by_id is created
        assert by_checksum is created
        assert wrong_owner is None

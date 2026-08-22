from sqlalchemy import select

from src.db.models import tasks as task_models

from ..repository_base import RepositoryBase


class TaskResourceRepository(RepositoryBase[task_models.TaskResource]):
    async def get_by_id_and_owner(
        self,
        resource_id: int,
        owner_type: task_models.TaskResourceOwnerType,
        owner_id: int,
    ) -> task_models.TaskResource | None:
        return await self._db_session.scalar(
            select(task_models.TaskResource).where(
                task_models.TaskResource.id == resource_id,
                task_models.TaskResource.owner_type == owner_type,
                task_models.TaskResource.owner_id == owner_id,
            )
        )

    async def get_by_checksum_and_owner(
        self,
        checksum: str,
        owner_type: task_models.TaskResourceOwnerType,
        owner_id: int,
    ) -> task_models.TaskResource | None:
        return await self._db_session.scalar(
            select(task_models.TaskResource).where(
                task_models.TaskResource.checksum == checksum,
                task_models.TaskResource.owner_type == owner_type,
                task_models.TaskResource.owner_id == owner_id,
            )
        )

    async def create(
        self,
        *,
        owner_type: task_models.TaskResourceOwnerType,
        owner_id: int,
        filename: str,
        checksum: str,
    ) -> task_models.TaskResource:
        resource = task_models.TaskResource(
            owner_type=owner_type,
            owner_id=owner_id,
            filename=filename,
            checksum=checksum,
        )
        self._db_session.add(resource)
        await self._db_session.flush()
        return resource

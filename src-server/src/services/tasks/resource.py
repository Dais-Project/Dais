import asyncio
import hashlib
import shutil
from typing import Literal
from anyio import Path
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.common import DATA_DIR
from src.db.models import tasks as task_models
from src.utils import get_unique_filename
from ..service_base import ServiceBase


class TaskResourceService(ServiceBase):
    _logger = logger.bind(name="TaskResourceService")

    def __init__(self, db_session: AsyncSession, owner_type: Literal["tasks", "run_records"] ):
        super().__init__(db_session)
        self._owner_type = owner_type

    async def _get_resource_dir(self, task_id: int) -> Path:
        path = DATA_DIR / ".task-resources" / self._owner_type / str(task_id)
        path = Path(path)
        await path.mkdir(parents=True, exist_ok=True)
        return path

    async def load_task_resource(self, task_id: int, resource_id: int) -> Path | None:
        stmt = select(task_models.TaskResource).where(
            task_models.TaskResource.id == resource_id,
            task_models.TaskResource.owner_type == self._owner_type,
            task_models.TaskResource.owner_id == task_id,
        )
        resource = await self._db_session.scalar(stmt)
        if resource is None:
            return None

        resource_dir = await self._get_resource_dir(task_id)
        resource_path = resource_dir / resource.filename
        if not await resource_path.exists():
            return None
        return resource_path

    async def save_task_resource(
        self,
        task_id: int,
        filename: str,
        file_bytes: bytes,
    ) -> task_models.TaskResource:
        checksum = (await asyncio.to_thread(hashlib.sha256, file_bytes)).hexdigest()
        stmt = select(task_models.TaskResource).where(
            task_models.TaskResource.checksum == checksum,
            task_models.TaskResource.owner_type == self._owner_type,
            task_models.TaskResource.owner_id == task_id,
        )
        existing_resource = await self._db_session.scalar(stmt)
        if existing_resource is not None:
            return existing_resource

        resource_dir = await self._get_resource_dir(task_id)
        unique_name = get_unique_filename(filename)
        resource_path = resource_dir / unique_name
        await resource_path.write_bytes(file_bytes)

        try:
            new_resource = task_models.TaskResource(
                owner_type=self._owner_type,
                owner_id=task_id,
                filename=unique_name,
                checksum=checksum,
            )
            self._db_session.add(new_resource)
            await self._db_session.flush()
        except BaseException:
            self._logger.exception(
                f"Failed to add db record for {filename}, reverting path writing..."
            )
            if await resource_path.exists():
                await resource_path.unlink(missing_ok=True)
            raise

        return new_resource

    async def delete_task_resources(self, task_id: int) -> None:
        resource_dir = await self._get_resource_dir(task_id)
        await asyncio.to_thread(shutil.rmtree, resource_dir, True)

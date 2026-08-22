import asyncio
import hashlib
import shutil

from anyio import Path
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.common import DATA_DIR
from src.db.models import tasks as task_models
from src.repositories.tasks.resource import TaskResourceRepository
from src.schemas.tasks import runtime as task_runtime_schemas
from src.utils import get_unique_filename


class TaskResourceService:
    _logger = logger.bind(name="TaskResourceService")

    def __init__(self,
                 repository: TaskResourceRepository,
                 task_type: task_runtime_schemas.TaskType):
        self._repository = repository
        self._task_type = task_type

    @classmethod
    def from_db_session(cls,
                        db_session: AsyncSession,
                        task_type: task_runtime_schemas.TaskType) -> TaskResourceService:
        return cls(TaskResourceRepository(db_session), task_type)

    async def _get_resource_dir(self, task_id: int) -> Path:
        path = Path(DATA_DIR / ".task-resources" / self._task_type / str(task_id))
        await path.mkdir(parents=True, exist_ok=True)
        return path

    async def load_task_resource(self, task_id: int, resource_id: int) -> Path | None:
        resource = await self._repository.get_by_id_and_owner(
            resource_id,
            self._task_type.to_resource_owner_type(),
            task_id,
        )
        if resource is None: return None

        resource_path = await self._get_resource_dir(task_id) / resource.filename
        if not await resource_path.exists(): return None
        return resource_path

    async def save_task_resource(self,
                                 task_id: int,
                                 filename: str,
                                 file_bytes: bytes) -> task_models.TaskResource:
        checksum = (await asyncio.to_thread(hashlib.sha256, file_bytes)).hexdigest()
        owner_type = self._task_type.to_resource_owner_type()
        existing = await self._repository.get_by_checksum_and_owner(
            checksum,
            owner_type,
            task_id,
        )
        if existing is not None: return existing

        resource_dir = await self._get_resource_dir(task_id)
        unique_name = get_unique_filename(filename)
        resource_path = resource_dir / unique_name
        await resource_path.write_bytes(file_bytes)
        try:
            return await self._repository.create(
                owner_type=owner_type,
                owner_id=task_id,
                filename=unique_name,
                checksum=checksum,
            )
        except BaseException:
            self._logger.exception(
                f"Failed to add db record for {filename}, reverting path writing..."
            )
            await resource_path.unlink(missing_ok=True)
            raise

    async def delete_task_resources(self, task_id: int):
        resource_dir = await self._get_resource_dir(task_id)
        await asyncio.to_thread(shutil.rmtree, resource_dir, True)

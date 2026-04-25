import asyncio
import hashlib
import shutil
from anyio import Path
from sqlalchemy import select
from loguru import logger
from src.common import DATA_DIR
from src.db.models import tasks as task_models
from src.schemas.tasks import task as task_schemas
from src.utils import get_unique_filename
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .utils import build_load_options, Relations


class TaskNotFoundError(NotFoundError):
    def __init__(self, task_id: int) -> None:
        super().__init__(ServiceErrorCode.TASK_NOT_FOUND, "Task", task_id)


class TaskService(ServiceBase):
    _logger = logger.bind(name="TaskService")

    @staticmethod
    def relations() -> Relations:
        return [
            task_models.Task.agent,
            task_models.Task.workspace,
        ]

    def get_tasks_query(self, workspace_id: int):
        return (
            select(task_models.Task)
            .where(task_models.Task.workspace_id == workspace_id)
            .order_by(task_models.Task.id.desc())
        )

    def get_recent_tasks_query(self):
        return (
            select(task_models.Task)
            .order_by(
                task_models.Task.last_run_at.desc(),
                task_models.Task.id.desc(),
            )
        )

    async def get_task_by_id(self, id: int) -> task_models.Task:
        task = await self._db_session.get(
            task_models.Task, id,
            options=build_load_options(self.relations()),
        )
        if not task:
            raise TaskNotFoundError(id)
        return task

    async def create_task(self, data: task_schemas.TaskCreate) -> task_models.Task:
        new_task = task_models.Task(
            _workspace_id=data.workspace_id,
            **data.model_dump(exclude={"workspace_id"})
        )

        self._db_session.add(new_task)
        await self._db_session.flush()

        new_task = await self.get_task_by_id(new_task.id)
        return new_task

    async def update_task(self, id: int, data: task_schemas.TaskUpdate) -> task_models.Task:
        task = await self.get_task_by_id(id)

        if data.messages is not None:
            task.messages = data.messages

        self.apply_fields(task, data, exclude={"messages"})

        await self._db_session.flush()
        self._db_session.expunge(task)

        updated_task = await self.get_task_by_id(task.id)
        return updated_task

    async def delete_task(self, id: int) -> None:
        task = await self.get_task_by_id(id)
        await self.delete_task_resource(id)
        await self._db_session.delete(task)
        await self._db_session.flush()


    @staticmethod
    async def _get_resource_dir(task_id: int) -> Path:
        path = DATA_DIR / ".task-resources" / str(task_id)
        path = Path(path) # convert to anyio.Path
        await path.mkdir(parents=True, exist_ok=True)
        return path

    async def load_task_resource(self, id: int, resource_id: int) -> Path | None:
        stmt = select(task_models.TaskResource).where(
            task_models.TaskResource.id == resource_id,
            task_models.TaskResource._task_id == id,
        )
        resource = await self._db_session.scalar(stmt)
        if resource is None: return None
        resource_dir = await self._get_resource_dir(id)
        resource_path = resource_dir / resource.filename
        if not await resource_path.exists(): return None
        return resource_path

    async def save_task_resource(self, id: int, filename: str, file_bytes: bytes) -> task_models.TaskResource:
        checksum = (await asyncio.to_thread(hashlib.sha256, file_bytes)).hexdigest()
        stmt = select(task_models.TaskResource).where(
            task_models.TaskResource.checksum == checksum,
            task_models.TaskResource._task_id == id,
        )
        existing_resource = await self._db_session.scalar(stmt)
        if existing_resource is not None: return existing_resource

        resource_dir = await self._get_resource_dir(id)
        unique_name = get_unique_filename(filename)
        resource_path = resource_dir / unique_name
        await resource_path.write_bytes(file_bytes)

        try:
            new_resource = task_models.TaskResource(
                _task_id=id,
                filename=unique_name,
                checksum=checksum,
            )
            self._db_session.add(new_resource)
            await self._db_session.flush()
        except BaseException:
            self._logger.exception(f"Failed to add db record for {filename}, reverting path writing...")
            if await resource_path.exists():
                await resource_path.unlink(missing_ok=True)
            raise
        return new_resource

    async def delete_task_resource(self, id: int):
        resource_dir = await self._get_resource_dir(id)
        await asyncio.to_thread(shutil.rmtree, resource_dir, True)

import time

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.prompts import TitleSummarization
from src.agent.prompts import create_one_turn_llm
from src.db.models import tasks as task_models
from src.repositories.tasks.task import TaskRepository
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import task as task_schemas
from src.settings import use_app_setting_manager
from src.utils.retention import RetentionOption
from src.utils.retention import get_retention_cutoff
from src.utils.text import get_visual_length

from .resource import TaskResourceService
from ..exceptions import InternalError
from ..exceptions import NotFoundError
from ..exceptions import ServiceErrorCode


_logger = logger.bind(name="TaskService")


class TaskNotFoundError(NotFoundError):
    def __init__(self, task_id: int):
        super().__init__(ServiceErrorCode.TASK_NOT_FOUND, "Task", task_id)


class TaskService:
    def __init__(self,
                 repository: TaskRepository,
                 resource_service: TaskResourceService):
        self._repository = repository
        self._resource_service = resource_service

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> TaskService:
        resource_service = TaskResourceService.from_db_session(
            db_session,
            task_runtime_schemas.TaskType.TASK,
        )
        return cls(TaskRepository(db_session), resource_service)

    async def get_tasks_page(self, workspace_id: int, query: str | None = None):
        return await self._repository.get_page(workspace_id, query)

    async def get_recent_tasks_page(self):
        return await self._repository.get_recent_page()

    async def get_task_by_id(self, task_id: int) -> task_models.Task:
        task = await self._repository.get_by_id(task_id)
        if task is None:
            raise TaskNotFoundError(task_id)
        return task

    async def create_task(self, data: task_schemas.TaskCreate) -> task_models.Task:
        return await self._repository.create(data)

    async def update_task(
        self,
        task_id: int,
        data: task_schemas.TaskUpdate,
    ) -> task_models.Task:
        task = await self.get_task_by_id(task_id)
        return await self._repository.update(task, data)

    async def summarize_task_title(self, task_id: int) -> task_models.Task:
        task = await self.get_task_by_id(task_id)
        settings = use_app_setting_manager().settings
        if settings.flash_model is None or len(task.messages) == 0:
            raise InternalError(
                ServiceErrorCode.SUMMARIZE_TITLE_FAILED,
                "Failed to summarize task title",
            )
        try:
            llm = await create_one_turn_llm(settings.flash_model)
            title = await TitleSummarization(llm, settings.reply_language)(task.messages)
            _logger.info(f"Generated title: {title}")
        except Exception as error:
            _logger.exception("Failed to request title summarization")
            raise InternalError(
                ServiceErrorCode.SUMMARIZE_TITLE_FAILED,
                str(error) or "Failed to summarize task title",
            ) from error
        if len(title) == 0 or get_visual_length(title) > 40:
            raise InternalError(
                ServiceErrorCode.SUMMARIZE_TITLE_FAILED,
                "Failed to summarize task title",
            )
        return await self.update_task(
            task_id,
            task_schemas.TaskUpdate(
                title=title,
                messages=None,
                agent_id=None,
                last_run_at=int(time.time()),
                usage=None,
            ),
        )

    async def delete_task(self, task_id: int):
        task = await self.get_task_by_id(task_id)
        await self._repository.delete(task)
        if self._resource_service is not None:
            await self._resource_service.delete_task_resources(task_id)

    async def cleanup_outdated_tasks(self, retention: RetentionOption):
        cutoff = get_retention_cutoff(retention)
        if cutoff is None:
            return
        for task_id in await self._repository.get_ids_before(cutoff):
            await self.delete_task(task_id)

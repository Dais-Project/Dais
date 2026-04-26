from sqlalchemy import select
from src.db.models import tasks as task_models
from src.schemas.tasks import task as task_schemas
from ..service_base import ServiceBase
from ..exceptions import NotFoundError, ServiceErrorCode
from ..utils import build_load_options, Relations
from .resource import TaskResourceService


class TaskNotFoundError(NotFoundError):
    def __init__(self, task_id: int) -> None:
        super().__init__(ServiceErrorCode.TASK_NOT_FOUND, "Task", task_id)


class TaskService(ServiceBase):
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
        await TaskResourceService(self._db_session, "tasks").delete_task_resources(id)
        await self._db_session.delete(task)
        await self._db_session.flush()

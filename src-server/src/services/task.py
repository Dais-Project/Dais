from sqlalchemy import select
from src.db.models import task as task_models
from src.schemas import task as task_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .utils import build_load_options, Relations


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
            messages=data.messages,
            **data.model_dump(exclude={"messages", "workspace_id"})
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
        await self._db_session.delete(task)

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import task as task_models
from ..schemas import task as task_schemas


class TaskNotFoundError(NotFoundError):
    """Raised when a task is not found."""

    def __init__(self, task_id: int) -> None:
        super().__init__("Task", task_id)


class TaskService(ServiceBase):
    def get_tasks_query(self, workspace_id: int):
        return (
            select(task_models.Task)
            .where(task_models.Task.workspace_id == workspace_id)
            .order_by(task_models.Task.id.desc())
        )

    async def get_task_by_id(self, id: int) -> task_models.Task:
        task = await self._db_session.get(
            task_models.Task, id,
            options=[
                selectinload(task_models.Task.agent),
                selectinload(task_models.Task.workspace),
            ],
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
        await self._db_session.refresh(new_task)
        return new_task

    async def update_task(self, id: int, data: task_schemas.TaskUpdate) -> task_models.Task:        
        task = await self.get_task_by_id(id)

        if data.messages is not None:
            task.messages = data.messages

        update_data = data.model_dump(exclude_unset=True, exclude={"messages"})
        for key, value in update_data.items():
            if hasattr(task, key) and value is not None:
                setattr(task, key, value)

        await self._db_session.flush()
        await self._db_session.refresh(task)
        return task

    async def delete_task(self, id: int) -> None:
        task = await self._db_session.get(task_models.Task, id)
        if not task:
            raise TaskNotFoundError(id)
        await self._db_session.delete(task)

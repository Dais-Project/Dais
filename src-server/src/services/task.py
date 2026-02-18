from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from .exceptions import NotFoundError
from ..db.models import task as task_models
from ..db.schemas import task as task_schemas

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

    def get_task_by_id(self, id: int) -> task_models.Task:
        task = self._db_session.get(
            task_models.Task,
            id,
            options=[
                selectinload(task_models.Task.agent),
                selectinload(task_models.Task.workspace)
            ]
        )
        if not task:
            raise TaskNotFoundError(id)
        return task

    def create_task(self, data: task_schemas.TaskCreate) -> task_models.Task:
        new_task = task_models.Task(
            _workspace_id=data.workspace_id,
            **data.model_dump(exclude={"workspace_id"})
        )

        try:
            self._db_session.add(new_task)
            self._db_session.commit()
            self._db_session.refresh(new_task)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_task

    def update_task(self, id: int, data: task_schemas.TaskUpdate) -> task_models.Task:
        task = self._db_session.get(task_models.Task, id)
        if not task:
            raise TaskNotFoundError(id)

        if data.messages is not None:
            task.messages = data.messages

        update_data = data.model_dump(exclude_unset=True, exclude={"messages"})
        for key, value in update_data.items():
            if hasattr(task, key) and value is not None:
                setattr(task, key, value)

        try:
            self._db_session.commit()
            self._db_session.refresh(task)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return task

    def delete_task(self, id: int) -> None:
        stmt = select(task_models.Task).where(task_models.Task.id == id)
        task = self._db_session.execute(stmt).scalar_one_or_none()

        if not task:
            raise TaskNotFoundError(id)

        try:
            self._db_session.delete(task)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

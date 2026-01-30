from sqlalchemy import select, func
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
    def create_task(self, data: task_schemas.TaskCreate) -> task_models.Task:
        new_task = task_models.Task(
            messages=data.messages,
            _workspace_id=data.workspace_id, # only write workspace_id on create
            **data.model_dump(exclude={"messages", "workspace_id"})
        )

        try:
            self._db_session.add(new_task)
            self._db_session.commit()
            self._db_session.refresh(new_task)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_task

    def get_tasks(self, workspace_id: int, page: int = 1, per_page: int = 10) -> dict:
        if page < 1: page = 1
        if per_page < 5 or per_page > 100: per_page = 10

        base_query = select(task_models.Task).where(task_models.Task.workspace_id == workspace_id)
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = self._db_session.execute(count_stmt).scalar() or 0

        offset = (page - 1) * per_page
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        stmt = base_query.order_by(task_models.Task.id.desc()).limit(per_page).offset(offset)
        tasks = self._db_session.execute(stmt).scalars().all()

        return {
            "items": list(tasks),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

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

    def update_task(self, id: int, data: task_schemas.TaskUpdate) -> task_models.Task:
        stmt = select(task_models.Task).where(task_models.Task.id == id)
        task = self._db_session.execute(stmt).scalar_one_or_none()

        if not task:
            raise TaskNotFoundError(id)

        update_data = data.model_dump(exclude_unset=True)

        if data.messages is not None:
            task.messages = data.messages

        for key, value in update_data.items():
            if key != "messages" and hasattr(task, key):
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

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import BadRequestError, NotFoundError, ServiceErrorCode
from ..db.models import task as task_models
from ..schemas import task as task_schemas


class TaskNotFoundError(NotFoundError):
    def __init__(self, task_id: int) -> None:
        super().__init__(ServiceErrorCode.TASK_NOT_FOUND, "Task", task_id)

class TaskMessageNotFoundError(NotFoundError):
    def __init__(self, message_id: str) -> None:
        super().__init__(ServiceErrorCode.TASK_MESSAGE_NOT_FOUND, "Task message", message_id)

class TaskMessageNotEditableError(BadRequestError):
    def __init__(self, message_id: str) -> None:
        super().__init__(ServiceErrorCode.TASK_MESSAGE_NOT_EDITABLE, f"Task message '{message_id}' is not editable")

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
            messages=data.messages,
            **data.model_dump(exclude={"messages", "workspace_id"})
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
        task = await self.get_task_by_id(id)
        await self._db_session.delete(task)

    async def edit_task_message(self, id: int, message_id: str, content: str) -> task_models.Task:
        task = await self.get_task_by_id(id)
        target_index = None

        for index, message in enumerate(task.messages):
            if getattr(message, "id", None) == message_id:
                target_index = index
                break

        if target_index is None:
            raise TaskMessageNotFoundError(message_id)

        target_message = task.messages[target_index]
        if target_message.role != "user":
            raise TaskMessageNotEditableError(message_id)

        target_message.content = content
        task.messages = task.messages[: target_index + 1]

        await self._db_session.flush()
        await self._db_session.refresh(task)
        return task

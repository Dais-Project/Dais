from dais_sdk.types import UserMessage
from sqlalchemy.orm import selectinload
from src.db.models import tasks as task_models
from src.schemas.tasks import subtask as subtask_schemas
from ..service_base import ServiceBase
from ..exceptions import NotFoundError, ServiceErrorCode


class SubtaskNotFoundError(NotFoundError):
    def __init__(self, subtask_id: int) -> None:
        super().__init__(ServiceErrorCode.SUBTASK_NOT_FOUND, "Subtask", subtask_id)

class SubtaskService(ServiceBase):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.Subtask.task),
            selectinload(task_models.Subtask.agent),
        ]

    async def get_subtask_by_id(self, id: int) -> task_models.Subtask:
        subtask = await self._db_session.get(
            task_models.Subtask,
            id,
            options=self.relations(),
        )
        if not subtask:
            raise SubtaskNotFoundError(id)
        return subtask

    async def create_subtask(self, data: subtask_schemas.SubtaskCreate) -> task_models.Subtask:
        new_subtask = task_models.Subtask(
            messages=[UserMessage(content=data.instruction)],
            **data.model_dump(exclude={"instruction"})
        )

        self._db_session.add(new_subtask)
        await self._db_session.flush()

        new_subtask = await self.get_subtask_by_id(new_subtask.id)
        return new_subtask

    async def update_subtask(self, id: int, data: subtask_schemas.SubtaskUpdate) -> task_models.Subtask:
        subtask = await self.get_subtask_by_id(id)

        if data.messages is not None:
            subtask.messages = data.messages

        self.apply_fields(subtask, data, exclude={"messages"})

        await self._db_session.flush()
        self._db_session.expunge(subtask)

        updated_subtask = await self.get_subtask_by_id(subtask.id)
        return updated_subtask

from dais_sdk.types import UserMessage
from sqlalchemy.orm import selectinload

from src.db.models import tasks as task_models
from src.schemas.tasks import subtask as subtask_schemas

from ..repository_base import RepositoryBase


class SubtaskRepository(RepositoryBase[task_models.Subtask]):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.Subtask.task),
            selectinload(task_models.Subtask.agent),
        ]

    async def get_by_id(self, subtask_id: int) -> task_models.Subtask | None:
        return await self._db_session.get(
            task_models.Subtask,
            subtask_id,
            options=self.relations(),
        )

    async def create(
        self,
        data: subtask_schemas.SubtaskCreate,
    ) -> task_models.Subtask:
        subtask = task_models.Subtask(
            messages=[UserMessage(content=data.instruction)],
            **data.model_dump(exclude={"instruction"}),
        )
        self._db_session.add(subtask)
        subtask_id = await self.flush_and_expunge(subtask)
        created = await self.get_by_id(subtask_id)
        assert created is not None
        return created

    async def update(
        self,
        subtask: task_models.Subtask,
        data: subtask_schemas.SubtaskUpdate,
    ) -> task_models.Subtask:
        if data.messages is not None:
            subtask.messages = data.messages
        self.apply_fields(subtask, data, exclude={"messages"})
        subtask_id = await self.flush_and_expunge(subtask)
        updated = await self.get_by_id(subtask_id)
        assert updated is not None
        return updated

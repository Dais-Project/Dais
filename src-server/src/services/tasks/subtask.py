from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.repositories.tasks.subtask import SubtaskRepository
from src.schemas.tasks import subtask as subtask_schemas

from ..exceptions import NotFoundError
from ..exceptions import ServiceErrorCode


class SubtaskNotFoundError(NotFoundError):
    def __init__(self, subtask_id: int):
        super().__init__(ServiceErrorCode.SUBTASK_NOT_FOUND, "Subtask", subtask_id)


class SubtaskService:
    def __init__(self, repository: SubtaskRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> SubtaskService:
        return cls(SubtaskRepository(db_session))

    async def get_subtask_by_id(self, subtask_id: int) -> task_models.Subtask:
        subtask = await self._repository.get_by_id(subtask_id)
        if subtask is None:
            raise SubtaskNotFoundError(subtask_id)
        return subtask

    async def create_subtask(self, data: subtask_schemas.SubtaskCreate) -> task_models.Subtask:
        return await self._repository.create(data)

    async def update_subtask(self,
                             subtask_id: int,
                             data: subtask_schemas.SubtaskUpdate) -> task_models.Subtask:
        subtask = await self.get_subtask_by_id(subtask_id)
        return await self._repository.update(subtask, data)

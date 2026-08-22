from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import provider as provider_models
from src.repositories.provider import LlmModelRepository

from .exceptions import NotFoundError, ServiceErrorCode


class ModelNotFoundError(NotFoundError):
    def __init__(self, model_id: int):
        super().__init__(ServiceErrorCode.MODEL_NOT_FOUND, "Model", model_id)


class LlmModelService:
    def __init__(self, repository: LlmModelRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> LlmModelService:
        return cls(LlmModelRepository(db_session))

    async def get_by_id(self, model_id: int) -> provider_models.LlmModel:
        model = await self._repository.get_by_id(model_id)
        if model is None:
            raise ModelNotFoundError(model_id)
        return model

from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from ..db.models import provider as provider_models


class ModelNotFoundError(NotFoundError):
    def __init__(self, model_id: int) -> None:
        super().__init__(ServiceErrorCode.MODEL_NOT_FOUND, "Model", model_id)

class LlmModelService(ServiceBase):
    async def get_model_by_id(self, model_id: int) -> provider_models.LlmModel:
        model = await self._db_session.get(
            provider_models.LlmModel,
            model_id,
            options=[selectinload(provider_models.LlmModel.provider)],
        )
        if not model:
            raise ModelNotFoundError(model_id)
        return model

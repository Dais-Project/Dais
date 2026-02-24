from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import provider as provider_models


class ModelNotFoundError(NotFoundError):
    """Raised when a model is not found."""

    def __init__(self, model_id: int) -> None:
        super().__init__("Model", model_id)


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

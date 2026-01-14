from werkzeug.exceptions import HTTPException
from sqlalchemy.orm import joinedload
from .ServiceBase import ServiceBase
from ..db.models import provider as provider_models

class ModelNotFoundError(HTTPException):
    code = 404
    description = "Model not found"

class LlmModelService(ServiceBase):
    def get_model_by_id(self, model_id: int) -> provider_models.LlmModel | None:
        return self._db_session.get(
            provider_models.LlmModel,
            model_id,
            options=[joinedload(provider_models.LlmModel.provider)])

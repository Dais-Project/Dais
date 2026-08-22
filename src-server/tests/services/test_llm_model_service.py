import pytest
from dais_sdk.providers import LlmProviders
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import provider as provider_models
from src.services.exceptions import ServiceErrorCode
from src.services.llm_model import LlmModelService, ModelNotFoundError


@pytest.fixture
def llm_model_service(db_session: AsyncSession) -> LlmModelService:
    return LlmModelService.from_db_session(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestLlmModelService:
    @pytest.mark.asyncio
    async def test_get_model_by_id_not_found(self, llm_model_service: LlmModelService):
        with pytest.raises(ModelNotFoundError, match="Model '999' not found") as exc_info:
            await llm_model_service.get_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.MODEL_NOT_FOUND

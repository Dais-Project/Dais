import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.providers import LlmProviders

from src.db.models import provider as provider_models
from src.services.exceptions import ServiceErrorCode
from src.services.llm_model import LlmModelService, ModelNotFoundError


@pytest.fixture
def llm_model_service(db_session: AsyncSession) -> LlmModelService:
    return LlmModelService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestLlmModelService:
    @pytest.mark.asyncio
    async def test_get_model_by_id_not_found(self, llm_model_service: LlmModelService):
        with pytest.raises(ModelNotFoundError, match="Model '999' not found") as exc_info:
            await llm_model_service.get_model_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.MODEL_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_model_by_id_loads_provider(
        self,
        llm_model_service: LlmModelService,
        db_session: AsyncSession,
        provider_factory,
        llm_model_factory,
    ):
        provider = await provider_factory(
            name="Provider A",
            type=LlmProviders.OPENAI,
            base_url="https://example.com",
            api_key="sk-test",
        )
        model = await llm_model_factory(
            provider=provider,
            name="gpt-test",
            context_size=4096,
            capability=provider_models.LlmModelCapability(tool_use=True),
        )
        db_session.expunge_all()

        result = await llm_model_service.get_model_by_id(model.id)

        assert result.name == "gpt-test"
        assert result.provider.id == provider.id
        assert result.provider.name == "Provider A"

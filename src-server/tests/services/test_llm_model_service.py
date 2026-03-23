import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.providers import LlmProviders

from src.db.models import provider as provider_models
from src.services.exceptions import ServiceErrorCode
from src.services.llm_model import LlmModelService, ModelNotFoundError


class TestLlmModelService:
    @pytest.mark.asyncio
    async def test_get_model_by_id_not_found(self, db_session: AsyncSession):
        service = LlmModelService(db_session)

        with pytest.raises(ModelNotFoundError) as exc_info:
            await service.get_model_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.MODEL_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_model_by_id_loads_provider(self, db_session: AsyncSession):
        provider = provider_models.Provider(
            name="Provider A",
            type=LlmProviders.OPENAI,
            base_url="https://example.com",
            api_key="sk-test",
            models=[
                provider_models.LlmModel(
                    name="gpt-test",
                    context_size=4096,
                    capability=provider_models.LlmModelCapability(tool_use=True),
                )
            ],
        )
        db_session.add(provider)
        await db_session.flush()
        db_session.expunge_all()

        service = LlmModelService(db_session)
        model = await service.get_model_by_id(provider.models[0].id)

        assert model.name == "gpt-test"
        assert model.provider.id == provider.id
        assert model.provider.name == "Provider A"

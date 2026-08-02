import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.providers import LlmProviders

from src.db.models import provider as provider_models
from src.schemas import provider as provider_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.provider import ProviderNotFoundError, ProviderService


@pytest.fixture
def provider_service(db_session: AsyncSession) -> ProviderService:
    return ProviderService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestProviderService:
    @pytest.mark.asyncio
    async def test_get_provider_by_id_not_found(self, provider_service: ProviderService):
        with pytest.raises(ProviderNotFoundError, match="Provider '999' not found") as exc_info:
            await provider_service.get_provider_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.PROVIDER_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_provider_with_models(
        self,
        provider_service: ProviderService,
    ):
        provider = await provider_service.create_provider(
            provider_schemas.ProviderCreate(
                name="Provider A",
                type=LlmProviders.OPENAI,
                base_url="https://example.com",
                api_key="sk-test",
                models=[
                    provider_schemas.LlmModelCreate(
                        name="gpt-1",
                        context_size=4096,
                        capability=provider_models.LlmModelCapability(tool_use=True),
                    )
                ],
            )
        )

        assert provider.name == "Provider A"
        assert provider.type == LlmProviders.OPENAI
        assert provider.base_url == "https://example.com"
        assert provider.api_key == "sk-test"
        assert len(provider.models) == 1
        assert provider.models[0].name == "gpt-1"
        assert provider.models[0].context_size == 4096
        assert provider.models[0].capability.tool_use is True
        assert provider.models[0].capability.reasoning_effort is None

    @pytest.mark.asyncio
    async def test_update_provider_updates_fields_and_models(
        self,
        provider_service: ProviderService,
        provider_factory,
        llm_model_factory,
    ):
        provider = await provider_factory(
            name="Provider A",
            type=LlmProviders.OPENAI,
            base_url="https://example.com",
            api_key="sk-test",
        )
        existing_model = await llm_model_factory(
            provider=provider,
            name="gpt-1",
            context_size=4096,
            capability=provider_models.LlmModelCapability(tool_use=True),
        )

        updated = await provider_service.update_provider(
            provider.id,
            provider_schemas.ProviderUpdate(
                name="Provider B",
                type=LlmProviders.OPENAI,
                base_url="https://example.org",
                api_key="sk-test-2",
                models=[
                    provider_schemas.LlmModelUpdate(
                        id=existing_model.id,
                        name="gpt-1b",
                        context_size=8192,
                        capability=provider_models.LlmModelCapability(tool_use=True, reasoning=True, reasoning_effort="high"),
                    ),
                    provider_schemas.LlmModelCreate(
                        name="gpt-2",
                        context_size=16384,
                        capability=provider_models.LlmModelCapability(vision=True),
                    ),
                    provider_schemas.LlmModelUpdate(
                        id=999,
                        name="missing",
                        context_size=1,
                        capability=provider_models.LlmModelCapability(),
                    ),
                ],
            ),
        )

        assert updated.name == "Provider B"
        assert updated.base_url == "https://example.org"
        assert updated.api_key == "sk-test-2"
        assert {model.name for model in updated.models} == {"gpt-1b", "gpt-2"}
        updated_model = next(model for model in updated.models if model.name == "gpt-1b")
        assert updated_model.capability.reasoning_effort == "high"

    @pytest.mark.asyncio
    async def test_delete_provider_removes_entity_and_model_children(
        self,
        provider_service: ProviderService,
        db_session: AsyncSession,
        provider_factory,
        llm_model_factory,
    ):
        provider = await provider_factory(name="Provider A")
        model = await llm_model_factory(
            provider=provider,
            name="gpt-1",
            context_size=4096,
            capability=provider_models.LlmModelCapability(tool_use=True),
        )

        await provider_service.delete_provider(provider.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(ProviderNotFoundError, match=f"Provider '{provider.id}' not found"):
            await provider_service.get_provider_by_id(provider.id)

        model_in_db = await db_session.scalar(
            select(provider_models.LlmModel).where(provider_models.LlmModel.id == model.id)
        )
        assert model_in_db is None

    @pytest.mark.asyncio
    async def test_legacy_capability_json_without_reasoning_effort_still_loads(
        self,
        provider_service: ProviderService,
        db_session: AsyncSession,
        provider_factory,
        llm_model_factory,
    ):
        """Old capability JSON (without the reasoning_effort key) must still deserialize."""
        provider = await provider_factory(name="Provider A")
        model = await llm_model_factory(
            provider=provider,
            name="gpt-1",
            context_size=4096,
            capability=provider_models.LlmModelCapability(tool_use=True, reasoning=True),
        )
        await db_session.flush()

        # Simulate a legacy row written before reasoning_effort existed
        await db_session.execute(
            text(
                "UPDATE llm_models SET capability = :capability WHERE id = :model_id"
            ),
            {
                "capability": '{"vision": false, "reasoning": true, "tool_use": true}',
                "model_id": model.id,
            },
        )
        db_session.expunge_all()

        reloaded = await provider_service.get_provider_by_id(provider.id)
        reloaded_model = reloaded.models[0]
        assert reloaded_model.capability.reasoning is True
        assert reloaded_model.capability.tool_use is True
        assert reloaded_model.capability.reasoning_effort is None

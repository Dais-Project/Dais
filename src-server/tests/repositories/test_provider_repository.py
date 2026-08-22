import pytest
from dais_sdk.providers import LlmProviders
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import provider as provider_models
from src.repositories.provider import LlmModelRepository
from src.repositories.provider import ProviderRepository
from src.schemas import provider as provider_schemas


@pytest.fixture
def provider_repository(db_session: AsyncSession) -> ProviderRepository:
    return ProviderRepository(db_session)


@pytest.fixture
def llm_model_repository(db_session: AsyncSession) -> LlmModelRepository:
    return LlmModelRepository(db_session)


@pytest.mark.integration
class TestProviderRepository:
    @pytest.mark.asyncio
    async def test_create_and_update_provider_models(
        self,
        provider_repository: ProviderRepository,
    ):
        created = await provider_repository.create(
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
        existing_model = created.models[0]

        updated = await provider_repository.update(
            created,
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
                        capability=provider_models.LlmModelCapability(
                            tool_use=True,
                            reasoning=True,
                            reasoning_effort="high",
                        ),
                    ),
                    provider_schemas.LlmModelCreate(
                        name="gpt-2",
                        context_size=16384,
                        capability=provider_models.LlmModelCapability(vision=True),
                    ),
                ],
            ),
        )

        assert updated.name == "Provider B"
        assert {model.name for model in updated.models} == {"gpt-1b", "gpt-2"}

    @pytest.mark.asyncio
    async def test_delete_provider_cascades_to_models(
        self,
        provider_repository: ProviderRepository,
        db_session: AsyncSession,
        provider_factory,
        llm_model_factory,
    ):
        provider = await provider_factory(name="Provider A")
        model = await llm_model_factory(provider=provider, name="gpt-1")

        loaded = await provider_repository.get_by_id(provider.id)
        assert loaded is not None
        await provider_repository.delete(loaded)
        db_session.expunge_all()

        model_in_db = await db_session.scalar(
            select(provider_models.LlmModel).where(
                provider_models.LlmModel.id == model.id
            )
        )
        assert model_in_db is None


@pytest.mark.integration
class TestLlmModelRepository:
    @pytest.mark.asyncio
    async def test_get_by_id_loads_provider(
        self,
        llm_model_repository: LlmModelRepository,
        db_session: AsyncSession,
        provider_factory,
        llm_model_factory,
    ):
        provider = await provider_factory(name="Provider A")
        model = await llm_model_factory(provider=provider, name="gpt-test")
        db_session.expunge_all()

        result = await llm_model_repository.get_by_id(model.id)

        assert result is not None
        assert result.provider.id == provider.id

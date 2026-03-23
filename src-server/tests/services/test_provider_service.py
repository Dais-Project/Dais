import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.providers import LlmProviders

from src.db.models import provider as provider_models
from src.schemas import provider as provider_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.provider import ProviderNotFoundError, ProviderService


class TestProviderService:
    @pytest.mark.asyncio
    async def test_get_provider_by_id_not_found(self, db_session: AsyncSession):
        service = ProviderService(db_session)

        with pytest.raises(ProviderNotFoundError) as exc_info:
            await service.get_provider_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.PROVIDER_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_provider_with_models(self, db_session: AsyncSession):
        service = ProviderService(db_session)
        data = provider_schemas.ProviderCreate(
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

        provider = await service.create_provider(data)

        assert provider.name == "Provider A"
        assert provider.type == LlmProviders.OPENAI
        assert provider.base_url == "https://example.com"
        assert provider.api_key == "sk-test"
        assert len(provider.models) == 1
        assert provider.models[0].name == "gpt-1"

    @pytest.mark.asyncio
    async def test_update_provider_updates_fields_and_models(self, db_session: AsyncSession):
        service = ProviderService(db_session)
        provider = await service.create_provider(
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
        existing_model_id = provider.models[0].id

        updated = await service.update_provider(
            provider.id,
            provider_schemas.ProviderUpdate(
                name="Provider B",
                type=LlmProviders.OPENAI,
                base_url="https://example.org",
                api_key="sk-test-2",
                models=[
                    provider_schemas.LlmModelUpdate(
                        id=existing_model_id,
                        name="gpt-1b",
                        context_size=8192,
                        capability=provider_models.LlmModelCapability(tool_use=True, reasoning=True),
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
        assert updated.type == LlmProviders.OPENAI
        assert updated.base_url == "https://example.org"
        assert updated.api_key == "sk-test-2"
        assert {model.name for model in updated.models} == {"gpt-1b", "gpt-2"}

    @pytest.mark.asyncio
    async def test_delete_provider_removes_entity(self, db_session: AsyncSession):
        service = ProviderService(db_session)
        provider = await service.create_provider(
            provider_schemas.ProviderCreate(
                name="Provider A",
                type=LlmProviders.OPENAI,
                base_url="https://example.com",
                api_key="sk-test",
                models=[],
            )
        )

        await service.delete_provider(provider.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(ProviderNotFoundError):
            await service.get_provider_by_id(provider.id)

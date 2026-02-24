from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import provider as provider_models
from ..schemas import provider as provider_schemas

_logger = logger.bind(name="ProviderService")


class ProviderNotFoundError(NotFoundError):
    """Raised when a provider is not found."""

    def __init__(self, provider_id: int) -> None:
        super().__init__("Provider", provider_id)


class ProviderService(ServiceBase):
    def get_providers_query(self):
        return (
            select(provider_models.Provider)
            .options(selectinload(provider_models.Provider.models))
            .order_by(provider_models.Provider.id.asc())
        )

    async def get_providers(self) -> list[provider_models.Provider]:
        stmt = self.get_providers_query()
        providers = await self._db_session.scalars(stmt)
        return list(providers.all())

    async def get_provider_by_id(self, provider_id: int) -> provider_models.Provider:
        provider = await self._db_session.get(
            provider_models.Provider,
            provider_id,
            options=[selectinload(provider_models.Provider.models)],
        )
        if not provider:
            raise ProviderNotFoundError(provider_id)
        return provider

    async def create_provider(self, data: provider_schemas.ProviderCreate) -> provider_models.Provider:
        new_provider = provider_models.Provider(
            name=data.name,
            type=data.type,
            base_url=data.base_url,
            api_key=data.api_key,
        )
        if data.models is not None:
            new_models = []
            for model_data in data.models:
                new_models.append(
                    provider_models.LlmModel(
                        capability=model_data.capability,
                        name=model_data.name,
                        context_size=model_data.context_size,
                    )
                )
            new_provider.models = new_models

        self._db_session.add(new_provider)
        await self._db_session.flush()
        await self._db_session.refresh(new_provider)
        return new_provider

    async def update_provider(self, id: int, data: provider_schemas.ProviderUpdate) -> provider_models.Provider:
        def merge_models(
            existing_models: list[provider_models.LlmModel],
            updated_models_data: list[
                provider_schemas.LlmModelUpdate | provider_schemas.LlmModelCreate
            ],
        ) -> list[provider_models.LlmModel]:
            existing_model_map: dict[int, provider_models.LlmModel] = {
                model.id: model for model in existing_models
            }

            created_models: list[provider_schemas.LlmModelCreate] = [
                model
                for model in updated_models_data
                if isinstance(model, provider_schemas.LlmModelCreate)
            ]
            updated_models: list[provider_schemas.LlmModelUpdate] = [
                model
                for model in updated_models_data
                if isinstance(model, provider_schemas.LlmModelUpdate)
            ]

            new_models: list[provider_models.LlmModel] = []
            new_models.extend(
                provider_models.LlmModel(
                    capability=model_data.capability,
                    name=model_data.name,
                    context_size=model_data.context_size,
                )
                for model_data in created_models
            )

            for model_data in updated_models:
                existing_model = existing_model_map.get(model_data.id)
                if not existing_model:
                    _logger.warning(
                        f"Model id '{model_data.id}' not found in existing models"
                    )
                    continue
                for key, value in model_data.model_dump(
                    exclude_unset=True, exclude={"id"}
                ).items():
                    if value is not None:
                        setattr(existing_model, key, value)
                new_models.append(existing_model)

            return new_models

        provider = await self.get_provider_by_id(id)

        if data.models is not None:
            provider.models = merge_models(provider.models, data.models)

        update_data = data.model_dump(exclude_unset=True, exclude={"models"})
        for key, value in update_data.items():
            if hasattr(provider, key) and value is not None:
                setattr(provider, key, value)

        await self._db_session.flush()
        await self._db_session.refresh(provider)
        return provider

    async def delete_provider(self, id: int) -> None:
        provider = await self._db_session.get(provider_models.Provider, id)
        if not provider:
            raise ProviderNotFoundError(id)
        await self._db_session.delete(provider)

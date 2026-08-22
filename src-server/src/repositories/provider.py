from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import provider as provider_models
from src.schemas import provider as provider_schemas

from .repository_base import RepositoryBase


_logger = logger.bind(name="ProviderRepository")


class ProviderRepository(RepositoryBase[provider_models.Provider]):
    @staticmethod
    def relations():
        return [selectinload(provider_models.Provider.models)]

    def get_query(self):
        return (
            select(provider_models.Provider)
            .options(*self.relations())
            .order_by(provider_models.Provider.id.asc())
        )

    async def get_page(self):
        from fastapi_pagination.ext.sqlalchemy import apaginate

        return await apaginate(self._db_session, self.get_query())

    async def get_all(self) -> list[provider_models.Provider]:
        providers = await self._db_session.scalars(self.get_query())
        return list(providers.all())

    async def get_by_id(self, provider_id: int) -> provider_models.Provider | None:
        return await self._db_session.get(
            provider_models.Provider,
            provider_id,
            options=self.relations(),
        )

    async def create(
        self,
        data: provider_schemas.ProviderCreate,
    ) -> provider_models.Provider:
        provider = provider_models.Provider(
            name=data.name,
            type=data.type,
            base_url=data.base_url,
            api_key=data.api_key,
            models=[
                provider_models.LlmModel(
                    capability=model.capability,
                    name=model.name,
                    context_size=model.context_size,
                )
                for model in data.models
            ],
        )
        self._db_session.add(provider)
        provider_id = await self.flush_and_expunge(provider)
        created = await self.get_by_id(provider_id)
        assert created is not None
        return created

    async def update(
        self,
        provider: provider_models.Provider,
        data: provider_schemas.ProviderUpdate,
    ) -> provider_models.Provider:
        if data.models is not None:
            provider.models = self._merge_models(provider.models, data.models)
        self.apply_fields(provider, data, exclude={"models"})
        provider_id = await self.flush_and_expunge(provider)
        updated = await self.get_by_id(provider_id)
        assert updated is not None
        return updated

    async def delete(self, provider: provider_models.Provider):
        await self._db_session.delete(provider)
        await self._db_session.flush()

    @staticmethod
    def _merge_models(
        existing_models: list[provider_models.LlmModel],
        updated_models_data: list[
            provider_schemas.LlmModelUpdate | provider_schemas.LlmModelCreate
        ],
    ) -> list[provider_models.LlmModel]:
        existing_model_map = {model.id: model for model in existing_models}
        merged: list[provider_models.LlmModel] = []
        for model_data in updated_models_data:
            if isinstance(model_data, provider_schemas.LlmModelCreate):
                merged.append(
                    provider_models.LlmModel(
                        capability=model_data.capability,
                        name=model_data.name,
                        context_size=model_data.context_size,
                    )
                )
                continue
            model = existing_model_map.get(model_data.id)
            if model is None:
                _logger.warning(
                    f"Model id '{model_data.id}' not found in existing models"
                )
                continue
            for key, value in model_data.model_dump(
                exclude_unset=True,
                exclude={"id"},
            ).items():
                if value is not None:
                    setattr(model, key, value)
            merged.append(model)
        return merged


class LlmModelRepository(RepositoryBase[provider_models.LlmModel]):
    async def get_by_id(self, model_id: int) -> provider_models.LlmModel | None:
        return await self._db_session.get(
            provider_models.LlmModel,
            model_id,
            options=[selectinload(provider_models.LlmModel.provider)],
        )

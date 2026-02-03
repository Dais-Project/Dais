from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from .exceptions import NotFoundError
from ..db.models import provider as provider_models
from ..db.schemas import provider as provider_schemas

class ProviderNotFoundError(NotFoundError):
    """Raised when a provider is not found."""
    def __init__(self, provider_id: int) -> None:
        super().__init__("Provider", provider_id)

class ProviderService(ServiceBase):
    def get_providers(self) -> list[provider_models.Provider]:
        stmt = select(provider_models.Provider).options(
            selectinload(provider_models.Provider.models))
        providers = self._db_session.execute(stmt).scalars().all()
        return list(providers)

    def get_provider_by_id(self, provider_id: int) -> provider_models.Provider:
        provider = self._db_session.get(
            provider_models.Provider,
            provider_id,
            options=[selectinload(provider_models.Provider.models)])
        if not provider:
            raise ProviderNotFoundError(provider_id)
        return provider

    def create_provider(self, data: provider_schemas.ProviderCreate) -> provider_models.Provider:
        new_provider = provider_models.Provider(
            name=data.name,
            type=data.type,
            base_url=data.base_url,
            api_key=data.api_key
        )
        if data.models is not None:
            new_models = []
            for model_data in data.models:
                new_models.append(provider_models.LlmModel(
                    capability=model_data.capability,
                    name=model_data.name,
                    context_size=model_data.context_size
                ))
            new_provider.models = new_models
        try:
            self._db_session.add(new_provider)
            self._db_session.commit()
            self._db_session.refresh(new_provider)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_provider

    def update_provider(self, id: int, data: provider_schemas.ProviderUpdate) -> provider_models.Provider:
        def merge_models(
                existing_models: list[provider_models.LlmModel],
                updated_models_data: list[provider_schemas.LlmModelUpdate | provider_schemas.LlmModelCreate]
            ) -> list[provider_models.LlmModel]:
            existing_model_map: dict[str, provider_models.LlmModel] =\
                    {model.name: model for model in existing_models}

            # Separate new models from updates to avoid type issues
            new_models: list[provider_schemas.LlmModelCreate] = []
            update_models: list[provider_schemas.LlmModelUpdate] = []
            
            for model_data in updated_models_data:
                if isinstance(model_data, provider_schemas.LlmModelUpdate):
                    update_models.append(model_data)
                else:
                    new_models.append(model_data)

            updated_models = []

            # Process new models first
            for model_data in new_models:
                new_model = provider_models.LlmModel(
                    capability=model_data.capability,
                    name=model_data.name,
                    context_size=model_data.context_size
                )
                updated_models.append(new_model)

            # Process updates to existing models
            for model_data in update_models:
                model_id = model_data.id
                model_name = model_data.name

                # For existing models, check if the name and id match
                if model_name not in existing_model_map:
                    raise ValueError(f"Model name '{model_name}' not found in existing models")

                existing_model = existing_model_map[model_name]
                if existing_model.id != model_id:
                    raise ValueError(
                        f"Model name '{model_name}' conflict: "
                        f"expected id {existing_model.id} but got {model_id}"
                    )

                # Update existing model fields
                if model_data.context_size is not None:
                    existing_model.context_size = model_data.context_size
                if model_data.capability is not None:
                    existing_model.capability = model_data.capability
                updated_models.append(existing_model)

            return updated_models


        stmt = select(provider_models.Provider).where(provider_models.Provider.id == id)
        provider = self._db_session.execute(stmt).scalar_one_or_none()
        if not provider:
            raise ProviderNotFoundError(id)

        if data.models is not None:
            provider.models = merge_models(provider.models, data.models)

        update_data = data.model_dump(exclude_unset=True)
        update_data.pop("models", None)
        for key, value in update_data.items():
            if value is not None:
                setattr(provider, key, value)

        try:
            self._db_session.commit()
            self._db_session.refresh(provider)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return provider

    def delete_provider(self, id: int) -> None:
        stmt = select(provider_models.Provider).where(provider_models.Provider.id == id)
        provider = self._db_session.execute(stmt).scalar_one_or_none()
        if not provider:
            raise ProviderNotFoundError(id)
        try:
            self._db_session.delete(provider)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

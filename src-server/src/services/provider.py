from werkzeug.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from ..db.models import provider as provider_models

class ProviderNotFoundError(HTTPException):
    code = 404
    description = "Provider not found"

class ProviderService(ServiceBase):
    def get_providers(self) -> list[provider_models.Provider]:
        stmt = select(provider_models.Provider).options(
            selectinload(provider_models.Provider.models))
        providers = self._db_session.execute(stmt).scalars().all()
        return list(providers)

    def get_provider_by_id(self, provider_id: int) -> provider_models.Provider | None:
        return self._db_session.get(
            provider_models.Provider,
            provider_id,
            options=[selectinload(provider_models.Provider.models)])

    def create_provider(self, data: dict) -> provider_models.Provider:
        models_data = data.pop("models", None)
        new_provider = provider_models.Provider(**data)
        if models_data is not None:
            new_models = []
            for model_data in models_data:
                capability_data = model_data.pop("capability", {})
                new_models.append(provider_models.LlmModel(
                    capability=provider_models.LlmModelCapability(**capability_data),
                    **model_data))
            new_provider.models = new_models
        try:
            self._db_session.add(new_provider)
            self._db_session.commit()
            self._db_session.refresh(new_provider)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_provider

    def update_provider(self, id: int, data: dict) -> provider_models.Provider:
        def merge_models(
                existing_models: list[provider_models.LlmModel],
                updated_models_data: list[dict]
            ) -> list[provider_models.LlmModel]:
            existing_model_map: dict[str, provider_models.LlmModel] =\
                    {model.name: model for model in existing_models}

            updated_models = []
            for model_data in updated_models_data:
                model_id = model_data.get("id")
                model_name = model_data.get("name")
                capability_data = model_data.pop("capability", {})
                capability = provider_models.LlmModelCapability(**capability_data)

                # if id is None, it's a new model
                if model_id is None:
                    new_model = provider_models.LlmModel(
                        capability=capability,
                        **model_data)
                    updated_models.append(new_model)
                    continue

                # For existing models, check if the name and id match
                if model_name not in existing_model_map:
                    raise ValueError(f"Model name '{model_name}' not found in existing models")

                existing_model = existing_model_map[model_name]
                if existing_model.id != model_id:
                    raise ValueError(
                        f"Model name '{model_name}' conflict: "
                        f"expected id {existing_model.id} but got {model_id}"
                    )

                # Update existing model
                for key, value in model_data.items():
                    if key not in ("id", "capability") and value is not None:
                        setattr(existing_model, key, value)
                existing_model.capability = capability
                updated_models.append(existing_model)

            return updated_models


        stmt = select(provider_models.Provider).where(provider_models.Provider.id == id)
        provider = self._db_session.execute(stmt).scalar_one_or_none()
        if not provider:
            raise ProviderNotFoundError(f"Provider {id} not found")

        updated_models_data = data.pop("models", None)
        if updated_models_data is not None:
            provider.models = merge_models(provider.models, updated_models_data)

        for key, value in data.items():
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
            raise ProviderNotFoundError(f"Provider {id} not found")
        try:
            self._db_session.delete(provider)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

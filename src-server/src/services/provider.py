from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import provider as provider_models
from src.repositories.provider import ProviderRepository
from src.schemas import provider as provider_schemas

from .exceptions import NotFoundError, ServiceErrorCode


class ProviderNotFoundError(NotFoundError):
    def __init__(self, provider_id: int):
        super().__init__(ServiceErrorCode.PROVIDER_NOT_FOUND, "Provider", provider_id)


class ProviderService:
    def __init__(self, repository: ProviderRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> ProviderService:
        return cls(ProviderRepository(db_session))

    async def get_page(self):
        return await self._repository.get_page()

    async def get_all(self) -> list[provider_models.Provider]:
        return await self._repository.get_all()

    async def get_by_id(self, provider_id: int) -> provider_models.Provider:
        provider = await self._repository.get_by_id(provider_id)
        if provider is None:
            raise ProviderNotFoundError(provider_id)
        return provider

    async def create(self, data: provider_schemas.ProviderCreate) -> provider_models.Provider:
        return await self._repository.create(data)

    async def update(self, provider_id: int, data: provider_schemas.ProviderUpdate) -> provider_models.Provider:
        provider = await self.get_by_id(provider_id)
        return await self._repository.update(provider, data)

    async def delete(self, provider_id: int):
        provider = await self.get_by_id(provider_id)
        await self._repository.delete(provider)

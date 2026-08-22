import pytest
from dais_sdk.providers import LlmProviders
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import provider as provider_models
from src.schemas import provider as provider_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.provider import ProviderNotFoundError, ProviderService


@pytest.fixture
def provider_service(db_session: AsyncSession) -> ProviderService:
    return ProviderService.from_db_session(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestProviderService:
    @pytest.mark.asyncio
    async def test_get_provider_by_id_not_found(self, provider_service: ProviderService):
        with pytest.raises(ProviderNotFoundError, match="Provider '999' not found") as exc_info:
            await provider_service.get_provider_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.PROVIDER_NOT_FOUND

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import toolset as toolset_models
from src.schemas import toolset as toolset_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.toolset import ToolsetNotFoundError, ToolsetService


@pytest.fixture
def toolset_service(db_session: AsyncSession) -> ToolsetService:
    return ToolsetService.from_db_session(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestToolsetService:
    @pytest.mark.asyncio
    async def test_get_toolset_by_id_not_found(self, toolset_service: ToolsetService):
        with pytest.raises(ToolsetNotFoundError, match="Toolset '999' not found") as exc_info:
            await toolset_service.get_toolset_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.TOOLSET_NOT_FOUND

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import toolset as toolset_models
from src.schemas import toolset as toolset_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.toolset import ToolsetNotFoundError, ToolsetService


@pytest.fixture
def toolset_service(db_session: AsyncSession) -> ToolsetService:
    return ToolsetService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestToolsetService:
    @pytest.mark.asyncio
    async def test_get_toolset_by_id_not_found(self, toolset_service: ToolsetService):
        with pytest.raises(ToolsetNotFoundError, match="Toolset '999' not found") as exc_info:
            await toolset_service.get_toolset_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.TOOLSET_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_toolset_with_tools(self, toolset_service: ToolsetService):
        created = await toolset_service.create_toolset(
            toolset_schemas.ToolsetCreate(
                name="Toolset A",
                type=toolset_models.ToolsetType.MCP_LOCAL,
                params={
                    "command": "echo",
                    "args": ["hello"],
                    "env": {},
                },
            ),
            [
                ToolsetService.ToolLike(
                    name="Tool A",
                    internal_key="tool-a",
                    description="Tool A description",
                )
            ],
        )

        assert created.name == "Toolset A"
        assert created.internal_key == "Toolset A"
        assert created.type == toolset_models.ToolsetType.MCP_LOCAL
        assert len(created.tools) == 1
        assert created.tools[0].name == "Tool A"
        assert created.tools[0].description == "Tool A description"

    @pytest.mark.asyncio
    async def test_delete_toolset_removes_entity_and_tool_children(
        self,
        toolset_service: ToolsetService,
        db_session: AsyncSession,
        toolset_factory,
    ):
        tool = toolset_models.Tool(
            name="Tool A",
            internal_key="tool-a",
            description="Tool A description",
            is_enabled=True,
            auto_approve=False,
        )
        toolset = await toolset_factory(
            name="Toolset A",
            internal_key="toolset-a",
            tools=[tool],
        )

        await toolset_service.delete_toolset(toolset.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(ToolsetNotFoundError, match=f"Toolset '{toolset.id}' not found"):
            await toolset_service.get_toolset_by_id(toolset.id)

        tool_in_db = await db_session.scalar(
            select(toolset_models.Tool).where(toolset_models.Tool.id == tool.id)
        )
        assert tool_in_db is None

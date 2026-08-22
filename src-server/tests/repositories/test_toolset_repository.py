import pytest
from dais_sdk.mcp_client import LocalServerParams
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import toolset as toolset_models
from src.repositories.toolset import ToolsetRepository
from src.schemas import toolset as toolset_schemas
from src.services.toolset import ToolsetService


@pytest.fixture
def toolset_repository(db_session: AsyncSession) -> ToolsetRepository:
    return ToolsetRepository(db_session)


@pytest.mark.integration
class TestToolsetRepository:
    @pytest.mark.asyncio
    async def test_get_by_types_filters_by_type_and_name(
        self,
        toolset_repository: ToolsetRepository,
        toolset_factory,
    ):
        builtin_match = await toolset_factory(name="Release Tools")
        mcp_match = await toolset_factory(
            name="Release MCP",
            type=toolset_models.ToolsetType.MCP_LOCAL,
            params=LocalServerParams(command="echo", args=[], env={}),
        )
        await toolset_factory(name="Other tools")

        builtins = await toolset_repository.get_by_types(
            [toolset_models.ToolsetType.BUILT_IN],
            "release",
        )
        mcp = await toolset_repository.get_by_types(
            [toolset_models.ToolsetType.MCP_LOCAL],
            "release",
        )

        assert [toolset.id for toolset in builtins] == [builtin_match.id]
        assert [toolset.id for toolset in mcp] == [mcp_match.id]

    @pytest.mark.asyncio
    async def test_create_update_sync_and_delete_toolset(
        self,
        toolset_repository: ToolsetRepository,
        db_session: AsyncSession,
    ):
        created = await toolset_repository.create(
            toolset_schemas.ToolsetCreate(
                name="Toolset A",
                type=toolset_models.ToolsetType.MCP_LOCAL,
                params=LocalServerParams(command="echo", args=[], env={}),
            ),
            [
                ToolsetRepository.ToolLike(
                    name="Tool A",
                    internal_key="tool-a",
                    description="Tool A",
                )
            ],
        )
        removed_tool_id = created.tools[0].id

        updated = await toolset_repository.update(
            created,
            toolset_schemas.ToolsetUpdate(
                name="Toolset B",
                type=toolset_models.ToolsetType.MCP_LOCAL,
                params=None,
                is_enabled=False,
                tools=[
                    toolset_schemas.ToolUpdate(
                        id=removed_tool_id,
                        name="Tool A updated",
                        is_enabled=False,
                        auto_approve=True,
                    )
                ],
            ),
        )
        assert updated.name == "Toolset B"
        assert updated.tools[0].auto_approve is True

        synced = await toolset_repository.sync(
            updated,
            [
                ToolsetRepository.ToolLike(
                    name="Tool B",
                    internal_key="tool-b",
                    description="Tool B",
                )
            ],
        )
        assert [tool.internal_key for tool in synced.tools] == ["tool-b"]

        await toolset_repository.delete(synced)
        db_session.expunge_all()

        removed_tool = await db_session.scalar(
            select(toolset_models.Tool).where(
                toolset_models.Tool.id == removed_tool_id
            )
        )
        assert removed_tool is None
        assert await toolset_repository.get_by_id(synced.id) is None

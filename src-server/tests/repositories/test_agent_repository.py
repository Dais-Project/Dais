import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.agent import AgentRepository
from src.schemas import agent as agent_schemas


@pytest.fixture
def agent_repository(db_session: AsyncSession) -> AgentRepository:
    return AgentRepository(db_session)


@pytest.mark.integration
class TestAgentRepository:
    @pytest.mark.asyncio
    async def test_get_query_filters_by_name_or_description(
        self,
        agent_repository: AgentRepository,
        db_session: AsyncSession,
        agent_factory,
    ):
        name_match = await agent_factory(name="Release Agent", description="General")
        description_match = await agent_factory(
            name="Writer",
            description="Release notes",
        )
        await agent_factory(name="Reviewer", description="Code review")

        rows = await db_session.scalars(agent_repository.get_query("release"))

        assert [agent.id for agent in rows.all()] == [
            name_match.id,
            description_match.id,
        ]

    @pytest.mark.asyncio
    async def test_create_update_and_delete_agent_with_tools(
        self,
        agent_repository: AgentRepository,
        tool_factory,
    ):
        initial_tool = await tool_factory(name="Echo", internal_key="echo")
        replacement_tool = await tool_factory(name="Search", internal_key="search")

        created = await agent_repository.create(
            agent_schemas.AgentCreate(
                name="Agent A",
                description="Description A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[initial_tool.id],
            ),
            [initial_tool],
        )

        assert {tool.id for tool in created.usable_tools} == {initial_tool.id}

        updated = await agent_repository.update(
            created,
            agent_schemas.AgentUpdate(
                name="Agent B",
                description=None,
                icon_name=None,
                instruction="Instruction B",
                model_id=None,
                usable_tool_ids=[replacement_tool.id],
            ),
            [replacement_tool],
        )

        assert updated.name == "Agent B"
        assert updated.instruction == "Instruction B"
        assert {tool.id for tool in updated.usable_tools} == {replacement_tool.id}

        await agent_repository.delete(updated)

        assert await agent_repository.get_by_id(updated.id) is None

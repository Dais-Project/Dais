import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas import agent as agent_schemas
from src.services.agent import AgentNotFoundError, AgentService
from src.services.exceptions import ServiceErrorCode


@pytest.fixture
def agent_service(db_session: AsyncSession) -> AgentService:
    return AgentService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestAgentService:
    @pytest.mark.asyncio
    async def test_get_agent_by_id_not_found(self, agent_service: AgentService):
        with pytest.raises(AgentNotFoundError, match="Agent '999' not found") as exc_info:
            await agent_service.get_agent_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.AGENT_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_agent_with_tools(
        self,
        agent_service: AgentService,
        tool_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")

        agent = await agent_service.create_agent(
            agent_schemas.AgentCreate(
                name="Agent A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[tool.id],
            )
        )

        assert agent.name == "Agent A"
        assert agent.icon_name == "bot"
        assert agent.instruction == "Instruction A"
        assert agent.model_id is None
        assert {created_tool.id for created_tool in agent.usable_tools} == {tool.id}

    @pytest.mark.asyncio
    async def test_update_agent_updates_fields_and_tools(
        self,
        agent_service: AgentService,
        tool_factory,
    ):
        initial_tool = await tool_factory(name="Echo", internal_key="echo")
        initial = await agent_service.create_agent(
            agent_schemas.AgentCreate(
                name="Agent A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[initial_tool.id],
            )
        )
        new_tool = await tool_factory(name="Echo 2", internal_key="echo-2")

        updated = await agent_service.update_agent(
            initial.id,
            agent_schemas.AgentUpdate(
                name="Agent B",
                icon_name="sparkles",
                instruction="Instruction B",
                model_id=None,
                usable_tool_ids=[new_tool.id],
            ),
        )

        assert updated.name == "Agent B"
        assert updated.icon_name == "sparkles"
        assert updated.instruction == "Instruction B"
        assert updated.model_id is None
        assert {tool.id for tool in updated.usable_tools} == {new_tool.id}

    @pytest.mark.asyncio
    async def test_delete_agent_removes_entity(
        self,
        agent_service: AgentService,
        db_session: AsyncSession,
        tool_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_service.create_agent(
            agent_schemas.AgentCreate(
                name="Agent A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[tool.id],
            )
        )

        await agent_service.delete_agent(agent.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(AgentNotFoundError, match=f"Agent '{agent.id}' not found"):
            await agent_service.get_agent_by_id(agent.id)

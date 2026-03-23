import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models
from src.schemas import agent as agent_schemas
from src.services.agent import AgentNotFoundError, AgentService
from src.services.exceptions import ServiceErrorCode


class TestAgentService:
    @pytest.mark.asyncio
    async def test_get_agent_by_id_not_found(self, db_session: AsyncSession):
        service = AgentService(db_session)

        with pytest.raises(AgentNotFoundError) as exc_info:
            await service.get_agent_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.AGENT_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_agent_with_tools(self, db_session: AsyncSession, seeded_data):
        service = AgentService(db_session)
        data = agent_schemas.AgentCreate(
            name="Agent A",
            icon_name="bot",
            instruction="Instruction A",
            model_id=None,
            usable_tool_ids=[seeded_data.tool.id],
        )

        agent = await service.create_agent(data)

        assert agent.name == "Agent A"
        assert agent.icon_name == "bot"
        assert agent.instruction == "Instruction A"
        assert agent.model_id is None
        assert {tool.id for tool in agent.usable_tools} == {seeded_data.tool.id}

    @pytest.mark.asyncio
    async def test_update_agent_updates_fields_and_tools(self, db_session: AsyncSession, seeded_data):
        service = AgentService(db_session)
        initial = await service.create_agent(
            agent_schemas.AgentCreate(
                name="Agent A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[seeded_data.tool.id],
            )
        )

        new_tool = toolset_models.Tool(
            name="Echo 2",
            internal_key="echo-2",
            description="Echo tool 2",
            is_enabled=True,
            auto_approve=False,
        )
        new_toolset = toolset_models.Toolset(
            name="Built-in 2",
            internal_key="built-in-2",
            type=toolset_models.ToolsetType.BUILT_IN,
            params=None,
            is_enabled=True,
            tools=[new_tool],
        )
        db_session.add(new_toolset)
        await db_session.flush()

        updated = await service.update_agent(
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
        assert {tool.id for tool in updated.usable_tools} == {new_tool.id}

    @pytest.mark.asyncio
    async def test_delete_agent_removes_entity(self, db_session: AsyncSession, seeded_data):
        service = AgentService(db_session)
        agent = await service.create_agent(
            agent_schemas.AgentCreate(
                name="Agent A",
                icon_name="bot",
                instruction="Instruction A",
                model_id=None,
                usable_tool_ids=[seeded_data.tool.id],
            )
        )

        await service.delete_agent(agent.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(AgentNotFoundError):
            await service.get_agent_by_id(agent.id)

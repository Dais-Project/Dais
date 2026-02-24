from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .service_base import ServiceBase
from .exceptions import NotFoundError
from ..db.models import agent as agent_models
from ..db.models import toolset as toolset_models
from ..schemas import agent as agent_schemas


class AgentNotFoundError(NotFoundError):
    """Raised when an agent is not found."""

    def __init__(self, agent_id: int) -> None:
        super().__init__("Agent", agent_id)


class AgentService(ServiceBase):
    def get_agents_query(self):
        return (
            select(agent_models.Agent)
            .order_by(agent_models.Agent.id.asc())
        )

    async def get_agent_by_id(self, id: int) -> agent_models.Agent:
        agent = await self._db_session.get(
            agent_models.Agent, id,
            options=[
                selectinload(agent_models.Agent.model),
                selectinload(agent_models.Agent.usable_tools),
            ],
        )
        if not agent:
            raise AgentNotFoundError(id)
        return agent

    async def create_agent(self, data: agent_schemas.AgentCreate) -> agent_models.Agent:
        new_agent = agent_models.Agent(**data.model_dump())
        self._db_session.add(new_agent)
        await self._db_session.flush()
        await self._db_session.refresh(new_agent)
        return new_agent

    async def update_agent(self, id: int, data: agent_schemas.AgentUpdate) -> agent_models.Agent:
        agent = await self.get_agent_by_id(id)

        update_data = data.model_dump(exclude_unset=True,
                                                      exclude={"usable_tool_ids"})
        for key, value in update_data.items():
            if hasattr(agent, key) and value is not None:
                setattr(agent, key, value)
        
        if data.usable_tool_ids is not None:
            stmt = select(toolset_models.Tool).where(
                toolset_models.Tool.id.in_(data.usable_tool_ids)
            )
            tools = (await self._db_session.execute(stmt)).scalars().all()
            agent.usable_tools = list(tools)

        await self._db_session.flush()
        await self._db_session.refresh(agent)
        return agent

    async def delete_agent(self, id: int) -> None:
        agent = await self._db_session.get(agent_models.Agent, id)
        if not agent:
            raise AgentNotFoundError(id)
        await self._db_session.delete(agent)

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import agent as agent_models
from src.repositories.agent import AgentRepository
from src.schemas import agent as agent_schemas

from .exceptions import NotFoundError, ServiceErrorCode


class AgentNotFoundError(NotFoundError):
    def __init__(self, agent_id: int):
        super().__init__(ServiceErrorCode.AGENT_NOT_FOUND, "Agent", agent_id)


class AgentService:
    def __init__(self, repository: AgentRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> AgentService:
        return cls(AgentRepository(db_session))

    async def get_agents_page(self, query: str | None = None):
        return await self._repository.get_page(query)

    async def get_agent_by_id(self, agent_id: int) -> agent_models.Agent:
        agent = await self._repository.get_by_id(agent_id)
        if agent is None:
            raise AgentNotFoundError(agent_id)
        return agent

    async def create_agent(self, data: agent_schemas.AgentCreate) -> agent_models.Agent:
        tools = await self._repository.get_tools_by_ids(data.usable_tool_ids)
        return await self._repository.create(data, tools)

    async def update_agent(self, agent_id: int, data: agent_schemas.AgentUpdate) -> agent_models.Agent:
        agent = await self.get_agent_by_id(agent_id)
        tools = (
            await self._repository.get_tools_by_ids(data.usable_tool_ids)
            if data.usable_tool_ids is not None
            else None
        )
        return await self._repository.update(agent, data, tools)

    async def delete_agent(self, agent_id: int):
        agent = await self.get_agent_by_id(agent_id)
        await self._repository.delete(agent)

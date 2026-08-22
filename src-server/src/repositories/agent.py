from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models
from src.schemas import agent as agent_schemas

from .repository_base import RepositoryBase


class AgentRepository(RepositoryBase[agent_models.Agent]):
    @staticmethod
    def relations():
        return [
            selectinload(agent_models.Agent.model),
            selectinload(agent_models.Agent.usable_tools),
        ]

    def get_query(self, query: str | None = None):
        stmt = (
            select(agent_models.Agent)
            .order_by(agent_models.Agent.id.asc())
            .options(selectinload(agent_models.Agent.model))
        )
        if query:
            search_term = f"%{query}%"
            stmt = stmt.where(
                agent_models.Agent.name.ilike(search_term)
                | agent_models.Agent.description.ilike(search_term)
            )
        return stmt

    async def get_page(self, query: str | None = None):
        return await apaginate(self._db_session, self.get_query(query))

    async def get_by_id(self, agent_id: int) -> agent_models.Agent | None:
        return await self._db_session.get(
            agent_models.Agent,
            agent_id,
            options=self.relations(),
        )

    async def get_tools_by_ids(self, tool_ids: list[int]) -> list[toolset_models.Tool]:
        tools = await self._db_session.scalars(
            select(toolset_models.Tool).where(toolset_models.Tool.id.in_(tool_ids))
        )
        return list(tools.all())

    async def create(
        self,
        data: agent_schemas.AgentCreate,
        tools: list[toolset_models.Tool],
    ) -> agent_models.Agent:
        agent = agent_models.Agent(
            **data.model_dump(exclude={"usable_tool_ids"}),
            usable_tools=tools,
        )
        self._db_session.add(agent)
        agent_id = await self.flush_and_expunge(agent)
        created = await self.get_by_id(agent_id)
        assert created is not None
        return created

    async def update(
        self,
        agent: agent_models.Agent,
        data: agent_schemas.AgentUpdate,
        tools: list[toolset_models.Tool] | None,
    ) -> agent_models.Agent:
        self.apply_fields(agent, data, exclude={"usable_tool_ids"})
        if tools is not None:
            agent.usable_tools = tools
        agent_id = await self.flush_and_expunge(agent)
        updated = await self.get_by_id(agent_id)
        assert updated is not None
        return updated

    async def delete(self, agent: agent_models.Agent):
        await self._db_session.delete(agent)
        await self._db_session.flush()

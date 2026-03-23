from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models
from src.schemas import agent as agent_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .utils import build_load_options, Relations


class AgentNotFoundError(NotFoundError):
    def __init__(self, agent_id: int) -> None:
        super().__init__(ServiceErrorCode.AGENT_NOT_FOUND, "Agent", agent_id)

class AgentService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [
            agent_models.Agent._model,
            agent_models.Agent.usable_tools,
        ]

    def get_agents_query(self):
        return (
            select(agent_models.Agent)
            .order_by(agent_models.Agent.id.asc())
            .options(selectinload(agent_models.Agent._model))
        )

    async def get_agent_by_id(self, id: int) -> agent_models.Agent:
        agent = await self._db_session.get(
            agent_models.Agent, id,
            options=build_load_options(self.relations()),
        )
        if not agent:
            raise AgentNotFoundError(id)
        return agent

    async def _update_relations(self,
                                agent: agent_models.Agent,
                                data: agent_schemas.AgentCreate | agent_schemas.AgentUpdate
                                ):
        if data.usable_tool_ids is not None:
            stmt = select(toolset_models.Tool).where(
                toolset_models.Tool.id.in_(data.usable_tool_ids)
            )
            tools = (await self._db_session.scalars(stmt)).all()
            agent.usable_tools = list(tools)

    async def create_agent(self, data: agent_schemas.AgentCreate) -> agent_models.Agent:
        create_data = data.model_dump(exclude={"usable_tool_ids"})
        new_agent = agent_models.Agent(**create_data)

        await self._update_relations(new_agent, data)

        self._db_session.add(new_agent)
        await self._db_session.flush()

        new_agent = await self.get_agent_by_id(new_agent.id)
        return new_agent

    async def update_agent(self, id: int, data: agent_schemas.AgentUpdate) -> agent_models.Agent:
        updated_agent = await self.get_agent_by_id(id)

        self.apply_fields(updated_agent, data, exclude={"usable_tool_ids"})

        await self._update_relations(updated_agent, data)
        await self._db_session.flush()
        self._db_session.expunge(updated_agent)

        updated_agent = await self.get_agent_by_id(updated_agent.id)
        return updated_agent

    async def delete_agent(self, id: int) -> None:
        agent = await self.get_agent_by_id(id)
        await self._db_session.delete(agent)

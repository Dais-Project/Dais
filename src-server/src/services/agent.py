from typing import TypedDict
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from .exceptions import NotFoundError
from ..db.models import agent as agent_models
from ..db.models import workspace as workspace_models
from ..db.schemas import agent as agent_schemas

class AgentNotFoundError(NotFoundError):
    """Raised when an agent is not found."""
    def __init__(self, agent_id: int) -> None:
        super().__init__("Agent", agent_id)

class AgentService(ServiceBase):
    def get_agents_query(self):
        return (
            select(agent_models.Agent)
            .order_by(agent_models.Agent.id.desc())
        )

    def get_agent_by_id(self, id: int) -> agent_models.Agent:
        agent = self._db_session.get(
            agent_models.Agent,
            id,
            options=[selectinload(agent_models.Agent.model),
                     selectinload(agent_models.Agent.workspaces)])
        if not agent:
            raise AgentNotFoundError(id)
        return agent

    def create_agent(self, data: agent_schemas.AgentCreate) -> agent_models.Agent:
        new_agent = agent_models.Agent(**data.model_dump())

        try:
            self._db_session.add(new_agent)
            self._db_session.commit()
            self._db_session.refresh(new_agent)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_agent

    def update_agent(self, id: int, data: agent_schemas.AgentUpdate) -> agent_models.Agent:
        stmt = select(agent_models.Agent).where(
            agent_models.Agent.id == id)
        agent = self._db_session.execute(stmt).scalar_one_or_none()
        if not agent:
            raise AgentNotFoundError(id)

        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(agent, key, value)

        try:
            self._db_session.commit()
            self._db_session.refresh(agent)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return agent

    def delete_agent(self, id: int) -> None:
        stmt = select(agent_models.Agent).where(
            agent_models.Agent.id == id)
        agent = self._db_session.execute(stmt).scalar_one_or_none()
        if not agent:
            raise AgentNotFoundError(id)
        try:
            self._db_session.delete(agent)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

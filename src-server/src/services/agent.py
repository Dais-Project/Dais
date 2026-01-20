from typing import TypedDict
from werkzeug.exceptions import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from ..db.models import agent as agent_models
from ..db.models import workspace as workspace_models
from ..db.schemas import agent as agent_schemas

class AgentNotFoundError(HTTPException):
    code = 404
    def __init__(self, id: int):
        description = f"Agent {id} not found"
        super().__init__(description=description)

class AgentBrief(TypedDict):
    id: int
    name: str
    icon_name: str

class AgentService(ServiceBase):
    def get_agents(self, page: int = 1, per_page: int = 10) -> dict:
        if page < 1: page = 1
        if per_page < 5 or per_page > 100: per_page = 10

        count_stmt = select(func.count(agent_models.Agent.id))
        total = self._db_session.execute(count_stmt).scalar() or 0

        offset = (page - 1) * per_page
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        stmt = select(agent_models.Agent).limit(per_page).offset(offset)
        agents = self._db_session.execute(stmt).scalars().all()

        return {
            "items": list(agents),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

    def get_agents_brief(self) -> list[AgentBrief]:
        stmt = select(
            agent_models.Agent.id,
            agent_models.Agent.name,
            agent_models.Agent.icon_name)
        agents = self._db_session.execute(stmt).all()
        return [AgentBrief(id=id, name=name, icon_name=icon_name) for id, name, icon_name in agents]

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

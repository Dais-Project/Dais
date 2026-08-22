from typing import Annotated

from fastapi import Depends

from src.services.agent import AgentService

from .db_session import DbSessionDep


def get_agent_service(db_session: DbSessionDep) -> AgentService:
    return AgentService.from_db_session(db_session)


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

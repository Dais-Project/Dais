from typing import Annotated

from fastapi import Depends

from src.repositories.agent import AgentRepository
from src.services.agent import AgentService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_agent_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> AgentService:
    return AgentService(
        AgentRepository(db_session),
        on_resource_changed,
    )


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

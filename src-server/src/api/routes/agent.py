from typing import Annotated
from fastapi import APIRouter, Depends, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from ...services.agent import AgentService
from ...db.schemas import agent as agent_schemas

agents_router = APIRouter(tags=["agent"])

def get_agent_service():
    with AgentService() as service:
        yield service

AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

@agents_router.get("/", response_model=Page[agent_schemas.AgentRead])
def get_agents(service: AgentServiceDep):
    query = service.get_agents_query()
    return paginate(service.db_session, query)

@agents_router.get("/brief", response_model=list[agent_schemas.AgentBrief])
def get_agents_brief(service: AgentServiceDep):
    agents = service.get_agents_brief()
    return [agent_schemas.AgentBrief.model_validate(agent)
            for agent in agents]

@agents_router.get("/{agent_id}", response_model=agent_schemas.AgentRead)
def get_agent(agent_id: int, service: AgentServiceDep):
    agent = service.get_agent_by_id(agent_id)
    return agent_schemas.AgentRead.model_validate(agent)

@agents_router.post("/", status_code=status.HTTP_201_CREATED, response_model=agent_schemas.AgentRead)
def create_agent(
    service: AgentServiceDep,
    body: agent_schemas.AgentCreate,
):
    new_agent = service.create_agent(body)
    return agent_schemas.AgentRead.model_validate(new_agent)

@agents_router.put("/{agent_id}", response_model=agent_schemas.AgentRead)
def update_agent(
    agent_id: int,
    body: agent_schemas.AgentUpdate,
    service: AgentServiceDep,
):
    updated_agent = service.update_agent(agent_id, body)
    return agent_schemas.AgentRead.model_validate(updated_agent)

@agents_router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: int, service: AgentServiceDep):
    service.delete_agent(agent_id)

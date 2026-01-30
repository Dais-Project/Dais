from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from .types import PaginatedResponse
from ..services.agent import AgentService
from ..db.schemas import agent as agent_schemas

agents_router = APIRouter()

def get_agent_service():
    with AgentService() as service:
        yield service

AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

class AgentsQueryModel(BaseModel):
    page: int = 1
    per_page: int = 10

@agents_router.get("/", response_model=PaginatedResponse[agent_schemas.AgentRead])
def get_agents(
    service: AgentServiceDep,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1),
):
    result = service.get_agents(page, per_page)
    return PaginatedResponse[agent_schemas.AgentRead](
        items=[agent_schemas.AgentRead.model_validate(agent)
                for agent in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        total_pages=result["total_pages"]
    )

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

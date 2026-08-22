from fastapi import APIRouter
from fastapi import Query
from fastapi import status
from fastapi_pagination import Page

from src.schemas import agent as agent_schemas

from ..dependencies import AgentServiceDep


agents_router = APIRouter(tags=["agent"])

@agents_router.get("/", response_model=Page[agent_schemas.AgentBrief])
async def get_agents(
    service: AgentServiceDep,
    query: str | None = Query(default=None),
):
    return await service.get_agents_page(query)

@agents_router.get("/{agent_id}", response_model=agent_schemas.AgentRead)
async def get_agent(service: AgentServiceDep, agent_id: int):
    return await service.get_agent_by_id(agent_id)

@agents_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=agent_schemas.AgentRead,
)
async def create_agent(service: AgentServiceDep, body: agent_schemas.AgentCreate):
    return await service.create_agent(body)

@agents_router.put("/{agent_id}", response_model=agent_schemas.AgentRead)
async def update_agent(
    service: AgentServiceDep,
    agent_id: int,
    body: agent_schemas.AgentUpdate,
):
    return await service.update_agent(agent_id, body)

@agents_router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(service: AgentServiceDep, agent_id: int):
    await service.delete_agent(agent_id)

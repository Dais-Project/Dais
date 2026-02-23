from fastapi import APIRouter, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from ...db import DbSessionDep
from ...services.agent import AgentService
from ...schemas import agent as agent_schemas

agents_router = APIRouter(tags=["agent"])

@agents_router.get("/", response_model=Page[agent_schemas.AgentBrief])
async def get_agents(db_session: DbSessionDep):
    query = AgentService(db_session).get_agents_query()
    return await apaginate(db_session, query)

@agents_router.get("/{agent_id}", response_model=agent_schemas.AgentRead)
async def get_agent(agent_id: int, db_session: DbSessionDep):
    return await AgentService(db_session).get_agent_by_id(agent_id)

@agents_router.post("/", status_code=status.HTTP_201_CREATED, response_model=agent_schemas.AgentRead)
async def create_agent(
    db_session: DbSessionDep,
    body: agent_schemas.AgentCreate,
):
    return await AgentService(db_session).create_agent(body)

@agents_router.put("/{agent_id}", response_model=agent_schemas.AgentRead)
async def update_agent(
    agent_id: int,
    body: agent_schemas.AgentUpdate,
    db_session: DbSessionDep,
):
    return await AgentService(db_session).update_agent(agent_id, body)

@agents_router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: int, db_session: DbSessionDep):
    await AgentService(db_session).delete_agent(agent_id)

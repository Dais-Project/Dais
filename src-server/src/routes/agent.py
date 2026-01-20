from flask import Blueprint, Response
from pydantic import BaseModel
from flask_pydantic import validate
from .types import FlaskResponse, PaginatedResponse
from ..services.agent import AgentService
from ..db.schemas import agent as agent_schemas

agents_bp = Blueprint("agents", __name__)

class AgentsQueryModel(BaseModel):
    page: int = 1
    per_page: int = 10

@agents_bp.route("/", methods=["GET"])
@validate()
def get_agents(query: AgentsQueryModel) -> FlaskResponse[PaginatedResponse[agent_schemas.AgentRead]]:
    with AgentService() as service:
        result = service.get_agents(query.page, query.per_page)

        return PaginatedResponse[agent_schemas.AgentRead](
            items=[agent_schemas.AgentRead.model_validate(agent)
                   for agent in result["items"]],
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )

@agents_bp.route("/brief", methods=["GET"])
@validate(response_many=True)
def get_agents_brief() -> FlaskResponse[list[agent_schemas.AgentBrief]]:
    with AgentService() as service:
        agents = service.get_agents_brief()
        return [agent_schemas.AgentBrief.model_validate(agent)
                for agent in agents]

@agents_bp.route("/<int:agent_id>", methods=["GET"])
@validate()
def get_agent(agent_id: int) -> FlaskResponse[agent_schemas.AgentRead]:
    with AgentService() as service:
        agent = service.get_agent_by_id(agent_id)
        return agent_schemas.AgentRead.model_validate(agent)

@agents_bp.route("/", methods=["POST"])
@validate()
def create_agent(body: agent_schemas.AgentCreate) -> FlaskResponse[agent_schemas.AgentRead]:
    with AgentService() as service:
        new_agent = service.create_agent(body)
        return agent_schemas.AgentRead.model_validate(new_agent), 201

@agents_bp.route("/<int:agent_id>", methods=["PUT"])
@validate()
def update_agent(agent_id: int, body: agent_schemas.AgentUpdate) -> FlaskResponse[agent_schemas.AgentRead]:
    with AgentService() as service:
        updated_agent = service.update_agent(agent_id, body)
        return agent_schemas.AgentRead.model_validate(updated_agent)

@agents_bp.route("/<int:agent_id>", methods=["DELETE"])
def delete_agent(agent_id: int) -> FlaskResponse:
    with AgentService() as service:
        service.delete_agent(agent_id)
        return Response(status=204)

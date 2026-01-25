from typing import cast
from flask import Blueprint, Response
from flask_pydantic import validate
from pydantic import BaseModel
from .types import FlaskResponse
from ..agent.tool import use_mcp_toolset_manager, McpToolset
from ..services.toolset import ToolsetService
from ..db.schemas import toolset as toolset_schemas
from ..utils import use_async_task_pool

toolset_bp = Blueprint("toolset", __name__)
async_task_pool = use_async_task_pool()
mcp_toolset_manager = use_mcp_toolset_manager()

class ToolsetBrief(BaseModel):
    id: int
    name: str
    type: str
    # only available for MCP toolsets
    status: str | None = None

@toolset_bp.route("/brief", methods=["GET"])
@validate(response_many=True)
def get_toolsets_brief() -> FlaskResponse[list[ToolsetBrief]]:
    with ToolsetService() as service:
        built_in_toolsets = service.get_all_built_in_toolsets()
        mcp_toolsets = service.get_all_mcp_toolsets()
        mcp_toolset_map = {toolset.internal_key: toolset
                           for toolset in mcp_toolsets}

    result = []
    for toolset in built_in_toolsets:
        result.append(ToolsetBrief(id=toolset.id,
                                   name=toolset.name,
                                   type=toolset.type,
                                   status=None))
    for toolset in cast(list[McpToolset], mcp_toolset_manager.toolsets):
        ent = mcp_toolset_map[toolset.name]
        result.append(ToolsetBrief(id=ent.id,
                                   name=ent.name,
                                   type=ent.type,
                                   status=toolset.status))
    return result

@toolset_bp.route("/<int:toolset_id>", methods=["GET"])
@validate()
def get_toolset(toolset_id: int) -> FlaskResponse[toolset_schemas.ToolsetRead]:
    with ToolsetService() as service:
        toolset = service.get_toolset_by_id(toolset_id)
    return toolset_schemas.ToolsetRead.model_validate(toolset)

@toolset_bp.route("/", methods=["POST"])
@validate()
def create_mcp_toolset(body: toolset_schemas.ToolsetCreate) -> FlaskResponse[toolset_schemas.ToolsetRead]:
    with ToolsetService() as service:
        new_toolset = service.create_toolset(body)
    task_id = async_task_pool.add_task(mcp_toolset_manager.refresh_toolset_metadata())
    async_task_pool.wait_result(task_id)
    return toolset_schemas.ToolsetRead.model_validate(new_toolset), 201

@toolset_bp.route("/<int:toolset_id>", methods=["PUT"])
@validate()
def update_toolset(toolset_id: int, body: toolset_schemas.ToolsetUpdate) -> FlaskResponse[toolset_schemas.ToolsetRead]:
    with ToolsetService() as service:
        updated_toolset = service.update_toolset(toolset_id, body)
    task_id = async_task_pool.add_task(mcp_toolset_manager.refresh_toolset_metadata())
    async_task_pool.wait_result(task_id)
    return toolset_schemas.ToolsetRead.model_validate(updated_toolset)

@toolset_bp.route("/<int:toolset_id>", methods=["DELETE"])
def delete_toolset(toolset_id: int) -> FlaskResponse:
    with ToolsetService() as service:
        service.delete_toolset(toolset_id)
    task_id = async_task_pool.add_task(mcp_toolset_manager.refresh_toolset_metadata())
    async_task_pool.wait_result(task_id)
    return Response(status=204)

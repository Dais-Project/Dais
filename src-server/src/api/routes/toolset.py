from typing import Annotated, Literal, cast
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from ...agent.tool import McpToolset, McpToolsetStatus
from ...agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from ...db import DbSessionDep
from ...services.toolset import ToolsetService
from ...schemas import toolset as toolset_schemas

toolset_router = APIRouter(tags=["toolset"])

def get_mcp_toolset_manager(request: Request) -> McpToolsetManager:
    return request.state.mcp_toolset_manager
McpToolsetManagerDep = Annotated[McpToolsetManager, Depends(get_mcp_toolset_manager)]

class ToolsetBrief(BaseModel):
    id: int
    name: str
    type: toolset_schemas.ToolsetType
    # "connected" for built-in toolsets, McpToolsetStatus for MCP toolsets
    status: Literal["connected"] | McpToolsetStatus

@toolset_router.get("/brief", response_model=list[ToolsetBrief])
async def get_toolsets_brief(
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    service = ToolsetService(db_session)
    built_in_toolsets = await service.get_all_built_in_toolsets()
    mcp_toolsets = await service.get_all_mcp_toolsets()
    mcp_toolset_map = {toolset.internal_key: toolset for toolset in mcp_toolsets}

    result = []
    for toolset in built_in_toolsets:
        result.append(
            ToolsetBrief(
                id=toolset.id,
                name=toolset.name,
                type=toolset.type,
                status="connected",
            )
        )
    for toolset in cast(list[McpToolset], mcp_toolset_manager.toolsets):
        ent = mcp_toolset_map[toolset.name]
        result.append(
            ToolsetBrief(
                id=ent.id,
                name=ent.name,
                type=ent.type,
                status=toolset.status,
            )
        )
    return result

@toolset_router.get("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def get_toolset(toolset_id: int, db_session: DbSessionDep):
    toolset = await ToolsetService(db_session).get_toolset_by_id(toolset_id)
    return toolset_schemas.ToolsetRead.model_validate(toolset)

@toolset_router.post("/", status_code=status.HTTP_201_CREATED, response_model=toolset_schemas.ToolsetRead)
async def create_mcp_toolset(
    body: toolset_schemas.ToolsetCreate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    new_toolset = await ToolsetService(db_session).create_toolset(body)
    await mcp_toolset_manager.refresh_toolset_metadata()
    return toolset_schemas.ToolsetRead.model_validate(new_toolset)

@toolset_router.put("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def update_toolset(
    toolset_id: int,
    body: toolset_schemas.ToolsetUpdate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    updated_toolset = await ToolsetService(db_session).update_toolset(toolset_id, body)
    await mcp_toolset_manager.refresh_toolset_metadata()
    return toolset_schemas.ToolsetRead.model_validate(updated_toolset)

@toolset_router.delete("/{toolset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_toolset(
    toolset_id: int,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    await ToolsetService(db_session).delete_toolset(toolset_id)
    await mcp_toolset_manager.refresh_toolset_metadata()

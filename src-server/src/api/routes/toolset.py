import anyio
from typing import Annotated, cast
from fastapi import APIRouter, Depends, Request, status
from ..exceptions import ApiError, ApiErrorCode
from ...agent.tool import McpToolset
from ...agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from ...db import DbSessionDep
from ...services.toolset import ToolsetService
from ...schemas import toolset as toolset_schemas

toolset_router = APIRouter(tags=["toolset"])

def get_mcp_toolset_manager(request: Request) -> McpToolsetManager:
    return request.state.mcp_toolset_manager
type McpToolsetManagerDep = Annotated[McpToolsetManager, Depends(get_mcp_toolset_manager)]

@toolset_router.get("/brief", response_model=list[toolset_schemas.ToolsetBrief])
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
            toolset_schemas.ToolsetBrief(
                id=toolset.id,
                name=toolset.name,
                type=toolset.type,
                status="connected",
            )
        )
    for toolset in cast(list[McpToolset], mcp_toolset_manager.toolsets):
        ent = mcp_toolset_map[toolset.name]
        result.append(
            toolset_schemas.ToolsetBrief(
                id=ent.id,
                name=ent.name,
                type=ent.type,
                status=toolset.status,
            )
        )
    return result

@toolset_router.get("/", response_model=list[toolset_schemas.ToolsetRead])
async def get_toolsets(db_session: DbSessionDep):
    service = ToolsetService(db_session)
    built_in_toolsets = await service.get_all_built_in_toolsets()
    mcp_toolsets = await service.get_all_mcp_toolsets()
    return built_in_toolsets + mcp_toolsets

@toolset_router.get("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def get_toolset(toolset_id: int, db_session: DbSessionDep):
    return await ToolsetService(db_session).get_toolset_by_id(toolset_id)

@toolset_router.post("/", status_code=status.HTTP_201_CREATED, response_model=toolset_schemas.ToolsetRead)
async def create_toolset(
    body: toolset_schemas.ToolsetCreate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    new_toolset = await ToolsetService(db_session).create_toolset(body)
    if (body.type == toolset_schemas.ToolsetType.MCP_LOCAL or
        body.type == toolset_schemas.ToolsetType.MCP_REMOTE):
        try:
            with anyio.fail_after(15):
                await mcp_toolset_manager.append(new_toolset)
        except TimeoutError:
            raise ApiError(status.HTTP_408_REQUEST_TIMEOUT, ApiErrorCode.MCP_CONNECTION_TIMEOUT, f"Connect to MCP server timeout: {new_toolset.name}")
        except (ConnectionError, OSError):
            raise ApiError(status.HTTP_503_SERVICE_UNAVAILABLE, ApiErrorCode.MCP_CONNECTION_ERROR, f"Failed to connect to MCP server: {new_toolset.name}")
    return new_toolset

@toolset_router.put("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def update_toolset(
    toolset_id: int,
    body: toolset_schemas.ToolsetUpdate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    updated_toolset = await ToolsetService(db_session).update_toolset(toolset_id, body)
    if (updated_toolset.type == toolset_schemas.ToolsetType.MCP_LOCAL or
        updated_toolset.type == toolset_schemas.ToolsetType.MCP_REMOTE):
        await mcp_toolset_manager.refresh(updated_toolset)
    return updated_toolset

@toolset_router.delete("/{toolset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_toolset(
    toolset_id: int,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    await ToolsetService(db_session).delete_toolset(toolset_id)
    await mcp_toolset_manager.remove(toolset_id)

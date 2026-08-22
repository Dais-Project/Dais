from dais_sdk.mcp_client import LocalServerParams
from dais_sdk.mcp_client import RemoteServerParams
from dais_sdk.types import McpConnectionError
from fastapi import APIRouter
from fastapi import Query
from fastapi import status

from src.db import toolset_models
from src.schemas import toolset as toolset_schemas

from ..dependencies import McpToolsetServiceDep
from ..dependencies import ToolsetServiceDep
from ..exceptions import ApiError
from ..exceptions import ApiErrorCode


toolset_router = APIRouter(tags=["toolset"])

@toolset_router.get("/brief", response_model=list[toolset_schemas.ToolsetBrief])
async def get_toolsets_brief(
    toolset_service: ToolsetServiceDep,
    mcp_toolset_service: McpToolsetServiceDep,
    query: str | None = Query(default=None),
):
    builtins = await toolset_service.get_all_builtin_toolsets(query)
    briefs = [
        toolset_schemas.ToolsetBrief(
            id=toolset.id,
            name=toolset.name,
            type=toolset.type,
            status="connected",
            error_code=None,
        )
        for toolset in builtins
    ]
    mcp_entities = {
        toolset.id: toolset
        for toolset in await toolset_service.get_all_mcp_toolsets(query)
    }
    mcp_briefs = []
    for runtime_toolset in mcp_toolset_service.toolsets:
        entity = mcp_entities.get(runtime_toolset.id)
        if entity is None: continue

        mcp_briefs.append(
            toolset_schemas.ToolsetBrief(
                id=entity.id,
                name=entity.name,
                type=entity.type,
                status=runtime_toolset.status,
                error_code=runtime_toolset.error,
            )
        )
    mcp_briefs.sort(key=lambda item: item.id)
    return briefs + mcp_briefs

@toolset_router.get("/", response_model=list[toolset_schemas.ToolsetRead])
async def get_toolsets(service: ToolsetServiceDep):
    return await service.get_toolsets()

@toolset_router.get("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def get_toolset(service: ToolsetServiceDep, toolset_id: int):
    return await service.get_toolset_by_id(toolset_id)

@toolset_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=toolset_schemas.ToolsetRead,
)
async def create_toolset(
    toolset_service: ToolsetServiceDep,
    mcp_toolset_service: McpToolsetServiceDep,
    body: toolset_schemas.ToolsetCreate,
):
    if body.type == toolset_models.ToolsetType.BUILT_IN:
        raise ApiError(
            status.HTTP_400_BAD_REQUEST,
            ApiErrorCode.CANNOT_CREATE_BUILTIN_TOOLSET,
            "Cannot create built-in toolset",
        )
    try:
        toolset = await mcp_toolset_service.connect_toolset(
            body.name,
            body.type,
            body.params,
        )
        tools = mcp_toolset_service.get_tools(toolset)
        created = await toolset_service.create_toolset(body, tools)
        await mcp_toolset_service.append_toolset(toolset, created)
        return created
    except McpConnectionError as error:
        raise ApiError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            error.error_code,
            "Failed to connect to MCP server",
        ) from error

@toolset_router.put("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def update_toolset(
    toolset_service: ToolsetServiceDep,
    mcp_toolset_service: McpToolsetServiceDep,
    toolset_id: int,
    body: toolset_schemas.ToolsetUpdate,
):
    updated = await toolset_service.update_toolset(toolset_id, body)
    if updated.type == toolset_models.ToolsetType.BUILT_IN:
        return updated
    try:
        await mcp_toolset_service.replace_toolset(updated)
        return updated
    except McpConnectionError as error:
        raise ApiError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            error.error_code,
            "Failed to connect to MCP server",
        ) from error

@toolset_router.post("/{toolset_id}/reconnect", status_code=status.HTTP_204_NO_CONTENT)
async def reconnect_mcp_toolset(service: McpToolsetServiceDep, toolset_id: int):
    try:
        await service.reconnect_toolset(toolset_id)
    except McpConnectionError as error:
        raise ApiError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            error.error_code,
            "Failed to connect to MCP server",
        ) from error

@toolset_router.delete("/{toolset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_toolset(
    toolset_service: ToolsetServiceDep,
    mcp_toolset_service: McpToolsetServiceDep,
    toolset_id: int,
):
    await toolset_service.delete_toolset(toolset_id)
    await mcp_toolset_service.remove_toolset(toolset_id)

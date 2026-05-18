from typing import Annotated, cast
from dais_sdk.mcp_client import LocalServerParams, RemoteServerParams
from dais_sdk.tool import LocalMcpToolset, RemoteMcpToolset
from dais_sdk.types import McpConnectionError
from fastapi import APIRouter, Depends, Request, status
from loguru import logger
from src.db import toolset_models
from src.services.toolset import ToolsetService
from src.schemas import toolset as toolset_schemas
from src.agent.tool import McpToolset
from src.agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from ..dependencies import DbSessionDep
from ..exceptions import ApiError, ApiErrorCode


toolset_router = APIRouter(tags=["toolset"])
_logger = logger.bind(name="ToolsetRoute")

def get_mcp_toolset_manager(request: Request) -> McpToolsetManager:
    return request.state.mcp_toolset_manager
type McpToolsetManagerDep = Annotated[McpToolsetManager, Depends(get_mcp_toolset_manager)]

@toolset_router.get("/brief", response_model=list[toolset_schemas.ToolsetBrief])
async def get_toolsets_brief(
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    service = ToolsetService(db_session)
    builtin_toolsets = await service.get_all_builtin_toolsets()

    builtin_toolset_briefs = [
        toolset_schemas.ToolsetBrief(id=toolset.id,
                                     name=toolset.name,
                                     type=toolset.type,
                                     status="connected",
                                     error_code=None)
        for toolset in builtin_toolsets
    ]

    mcp_toolsets = await service.get_all_mcp_toolsets()
    mcp_toolset_map = {toolset.id: toolset for toolset in mcp_toolsets}
    mcp_toolset_briefs: list[toolset_schemas.ToolsetBrief] = []
    for toolset in cast(list[McpToolset], mcp_toolset_manager.toolsets):
        ent = mcp_toolset_map.get(toolset.id)
        if ent is None:
            _logger.warning(f"MCP toolset {toolset.id} {toolset.name} not found.")
            continue
        mcp_toolset_briefs.append(
            toolset_schemas.ToolsetBrief(id=ent.id,
                                         name=ent.name,
                                         type=ent.type,
                                         status=toolset.status,
                                         error_code=toolset.error))
    mcp_toolset_briefs.sort(key=lambda toolset: toolset.id)
    return builtin_toolset_briefs + mcp_toolset_briefs

@toolset_router.get("/", response_model=list[toolset_schemas.ToolsetRead])
async def get_toolsets(db_session: DbSessionDep):
    service = ToolsetService(db_session)
    builtin_toolsets = await service.get_all_builtin_toolsets()
    mcp_toolsets = await service.get_all_mcp_toolsets()
    return builtin_toolsets + mcp_toolsets

@toolset_router.get("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def get_toolset(toolset_id: int, db_session: DbSessionDep):
    return await ToolsetService(db_session).get_toolset_by_id(toolset_id)

@toolset_router.post("/", status_code=status.HTTP_201_CREATED, response_model=toolset_schemas.ToolsetRead)
async def create_toolset(
    body: toolset_schemas.ToolsetCreate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    match body.type:
        case toolset_models.ToolsetType.BUILT_IN:
            raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.CANNOT_CREATE_BUILTIN_TOOLSET, "Cannot create built-in toolset")
        case toolset_models.ToolsetType.MCP_LOCAL:
            assert isinstance(body.params, LocalServerParams)
            toolset = LocalMcpToolset(body.name, body.params)
        case toolset_models.ToolsetType.MCP_REMOTE:
            assert isinstance(body.params, RemoteServerParams)
            toolset = RemoteMcpToolset(body.name, body.params)

    try:
        await toolset.connect()
    except McpConnectionError as e:
        raise ApiError(status.HTTP_503_SERVICE_UNAVAILABLE, e.error_code, "Failed to connect to MCP server")

    tools = toolset.get_tools(namespaced_tool_name=False)
    new_toolset = await ToolsetService(db_session).create_toolset(body, [
        ToolsetService.ToolLike(
            name=tool.name,
            internal_key=toolset.format_tool_name(tool.name),
            description=tool.description)
        for tool in tools
    ])
    mcp_toolset_manager.append(toolset, new_toolset)
    return new_toolset

@toolset_router.put("/{toolset_id}", response_model=toolset_schemas.ToolsetRead)
async def update_toolset(
    toolset_id: int,
    body: toolset_schemas.ToolsetUpdate,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    updated_toolset = await ToolsetService(db_session).update_toolset(toolset_id, body)

    match body.type:
        case toolset_models.ToolsetType.BUILT_IN:
            return updated_toolset
        case toolset_models.ToolsetType.MCP_LOCAL:
            assert isinstance(body.params, LocalServerParams)
            toolset = LocalMcpToolset(updated_toolset.name, body.params)
        case toolset_models.ToolsetType.MCP_REMOTE:
            assert isinstance(body.params, RemoteServerParams)
            toolset = RemoteMcpToolset(updated_toolset.name, body.params)

    try:
        await toolset.connect()
    except McpConnectionError as e:
        raise ApiError(status.HTTP_503_SERVICE_UNAVAILABLE, e.error_code, "Failed to connect to MCP server")

    await mcp_toolset_manager.remove(toolset_id)
    mcp_toolset_manager.append(toolset, updated_toolset)
    return updated_toolset

@toolset_router.post("/{toolset_id}/reconnect", status_code=status.HTTP_204_NO_CONTENT)
async def reconnect_mcp_toolset(toolset_id: int, mcp_toolset_manager: McpToolsetManagerDep):
    target_toolset = None
    for toolset in mcp_toolset_manager.toolsets:
        assert isinstance(toolset, McpToolset)
        if toolset.id == toolset_id:
            target_toolset = toolset
            break
    if target_toolset is None:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.MCP_TOOLSET_NOT_FOUND)

    try:
        await target_toolset.disconnect()
        await target_toolset.connect()
    except McpConnectionError as e:
        raise ApiError(status.HTTP_503_SERVICE_UNAVAILABLE, e.error_code, "Failed to connect to MCP server")

@toolset_router.delete("/{toolset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_toolset(
    toolset_id: int,
    db_session: DbSessionDep,
    mcp_toolset_manager: McpToolsetManagerDep,
):
    await ToolsetService(db_session).delete_toolset(toolset_id)
    await mcp_toolset_manager.remove(toolset_id)

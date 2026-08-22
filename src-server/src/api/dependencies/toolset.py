from typing import Annotated

from fastapi import Depends, Request

from src.agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from src.services.mcp_toolset import McpToolsetService
from src.services.toolset import ToolsetService

from .db_session import DbSessionDep


def get_mcp_toolset_manager(request: Request) -> McpToolsetManager:
    return request.state.mcp_toolset_manager


McpToolsetManagerDep = Annotated[
    McpToolsetManager,
    Depends(get_mcp_toolset_manager),
]


def get_toolset_service(db_session: DbSessionDep) -> ToolsetService:
    return ToolsetService.from_db_session(db_session)


ToolsetServiceDep = Annotated[ToolsetService, Depends(get_toolset_service)]


def get_mcp_toolset_service(manager: McpToolsetManagerDep) -> McpToolsetService:
    return McpToolsetService(manager)


McpToolsetServiceDep = Annotated[
    McpToolsetService,
    Depends(get_mcp_toolset_service),
]

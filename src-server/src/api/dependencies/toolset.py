from typing import Annotated

from fastapi import Depends, Request

from src.agent.tool.toolset_manager.mcp_toolset_manager import McpToolsetManager
from src.repositories.toolset import ToolsetRepository
from src.services.mcp_toolset import McpToolsetService
from src.services.toolset import ToolsetService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_mcp_toolset_manager(request: Request) -> McpToolsetManager:
    return request.state.mcp_toolset_manager


McpToolsetManagerDep = Annotated[
    McpToolsetManager,
    Depends(get_mcp_toolset_manager),
]


def get_toolset_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> ToolsetService:
    return ToolsetService(
        ToolsetRepository(db_session),
        on_resource_changed,
    )


ToolsetServiceDep = Annotated[ToolsetService, Depends(get_toolset_service)]


def get_mcp_toolset_service(manager: McpToolsetManagerDep) -> McpToolsetService:
    return McpToolsetService(manager)


McpToolsetServiceDep = Annotated[
    McpToolsetService,
    Depends(get_mcp_toolset_service),
]

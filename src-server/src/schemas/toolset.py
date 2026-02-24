from typing import Literal
from dais_sdk import LocalServerParams, RemoteServerParams
from . import DTOBase
from ..db.models.toolset import ToolsetType
from ..agent.tool import McpToolsetStatus

class ToolBase(DTOBase):
    name: str
    description: str
    is_enabled: bool
    auto_approve: bool

class ToolRead(ToolBase):
    id: int
    toolset_id: int
    internal_key: str

class ToolUpdate(DTOBase):
    id: int
    name: str | None
    is_enabled: bool | None
    auto_approve: bool | None

class ToolsetBase(DTOBase):
    name: str
    type: ToolsetType
    params: LocalServerParams | RemoteServerParams | None
    is_enabled: bool

class ToolsetBrief(DTOBase):
    id: int
    name: str
    type: ToolsetType
    # "connected" for built-in toolsets, McpToolsetStatus for MCP toolsets
    status: Literal["connected"] | McpToolsetStatus

class ToolsetRead(ToolsetBase):
    id: int
    internal_key: str
    tools: list[ToolRead]

class ToolsetCreate(DTOBase):
    name: str
    type: ToolsetType
    params: LocalServerParams | RemoteServerParams

class ToolsetUpdate(DTOBase):
    name: str | None
    type: ToolsetType | None
    params: LocalServerParams | RemoteServerParams | None
    is_enabled: bool | None
    tools: list[ToolUpdate] | None

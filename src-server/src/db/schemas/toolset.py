from __future__ import annotations
from liteai_sdk import LocalServerParams, RemoteServerParams
from ..models.toolset import ToolsetType
from . import DTOBase

class ToolBase(DTOBase):
    name: str
    is_enabled: bool = True
    auto_approve: bool = False

class ToolRead(ToolBase):
    id: int
    toolset_id: int

class ToolUpdate(DTOBase):
    is_enabled: bool | None = None
    auto_approve: bool | None = None

class ToolsetBase(DTOBase):
    name: str
    type: ToolsetType
    params: LocalServerParams | RemoteServerParams | None = None
    is_enabled: bool = True

class ToolsetRead(ToolsetBase):
    id: int
    tools: list[ToolRead] = []

class ToolsetCreate(ToolsetBase):
    pass

class ToolsetUpdate(DTOBase):
    name: str | None = None
    type: ToolsetType | None = None
    params: LocalServerParams | RemoteServerParams | None = None
    is_enabled: bool | None = None

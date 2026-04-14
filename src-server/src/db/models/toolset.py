from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import TypeAdapter
from dais_sdk.mcp_client import LocalServerParams, RemoteServerParams
from . import Base, relationship
from .utils import PydanticJSON
from .relationships import workspace_tool_association_table, agent_tool_association_table

if TYPE_CHECKING:
    from .workspace import Workspace
    from .agent import Agent


mcp_params_adapter = TypeAdapter(LocalServerParams | RemoteServerParams)

class ToolsetType(str, Enum):
    BUILT_IN = "built_in"
    MCP_LOCAL = "mcp_local"
    MCP_REMOTE = "mcp_remote"

# --- --- --- --- --- ---

class Tool(Base):
    __tablename__ = "tools"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str] = mapped_column(default="")
    # this field is used to identify and find the specific tool in the toolset
    internal_key: Mapped[str] = mapped_column(unique=True)
    is_enabled: Mapped[bool] = mapped_column(default=True)
    auto_approve: Mapped[bool] = mapped_column(default=False)

    _toolset_id: Mapped[int] = mapped_column(ForeignKey("toolsets.id"))
    @hybrid_property
    def toolset_id(self) -> int: return self._toolset_id
    toolset: Mapped[Toolset] = relationship(back_populates="tools",
                                            foreign_keys=[_toolset_id],
                                            viewonly=True)

    _workspaces: Mapped[list[Workspace]] = relationship(secondary=workspace_tool_association_table,
                                                        back_populates="usable_tools",
                                                        viewonly=True)
    _agents: Mapped[list[Agent]] = relationship(secondary=agent_tool_association_table,
                                                back_populates="usable_tools",
                                                viewonly=True)

class Toolset(Base):
    __tablename__ = "toolsets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    internal_key: Mapped[str] = mapped_column(unique=True)
    type: Mapped[ToolsetType]
    params: Mapped[LocalServerParams | RemoteServerParams | None] = mapped_column(PydanticJSON(mcp_params_adapter))
    is_enabled: Mapped[bool] = mapped_column(default=True)
    tools: Mapped[list[Tool]] = relationship(back_populates="toolset", cascade="all, delete-orphan")

async def init(db_session: AsyncSession):
    from ...agent.tool import (
        BuiltInToolset,
        ExecutionControlToolset,
        FileSystemToolset,
        OsInteractionsToolset,
        UserInteractionToolset,
        WebInteractionToolset,
    )

    toolsets_to_init: list[tuple[str, type[BuiltInToolset]]] = [
        ("File System", FileSystemToolset),
        ("Execution Control", ExecutionControlToolset),
        ("OS Interactions", OsInteractionsToolset),
        ("User Interaction", UserInteractionToolset),
        ("Web Interaction", WebInteractionToolset),
    ]

    for name, toolset_t in toolsets_to_init:
        internal_key = toolset_t.internal_key()
        stmt = select(Toolset).where(Toolset.internal_key == internal_key).limit(1)
        exists = await db_session.scalar(stmt)
        if exists: continue
        db_session.add(Toolset(name=name,
                            internal_key=internal_key,
                            type=ToolsetType.BUILT_IN,
                            params=None,
                            is_enabled=True,
                            tools=[]))
        await db_session.flush()
        await toolset_t.sync(db_session)

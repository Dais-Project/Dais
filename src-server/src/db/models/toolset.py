from enum import Enum
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Session, Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property
from pydantic import TypeAdapter
from dais_sdk import LocalServerParams, RemoteServerParams, McpTool
from . import Base
from .utils import PydanticJSON

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
                                            viewonly=True)

    @staticmethod
    def from_mcp_tool(tool: McpTool) -> Tool:
        return Tool(name=tool.name, description=tool.description, internal_key=tool.name)

class Toolset(Base):
    __tablename__ = "toolsets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    internal_key: Mapped[str] = mapped_column(unique=True)
    type: Mapped[ToolsetType]
    params: Mapped[LocalServerParams | RemoteServerParams | None] = mapped_column(PydanticJSON(mcp_params_adapter))
    is_enabled: Mapped[bool] = mapped_column(default=True)
    tools: Mapped[list[Tool]] = relationship(back_populates="toolset", cascade="all, delete-orphan")

def init(session: Session):
    from ...agent.tool import FileSystemToolset, CodeExecutionToolset

    toolsets_to_init = [
        ("File System", FileSystemToolset.__name__, ToolsetType.BUILT_IN),
        ("Code Execution", CodeExecutionToolset.__name__, ToolsetType.BUILT_IN),
    ]

    try:
        for name, internal_key, type in toolsets_to_init:
            stmt = select(Toolset).where(Toolset.internal_key == internal_key)
            exists = session.execute(stmt).scalars().first()
            if exists: continue
            session.add(Toolset(
                name=name,
                internal_key=internal_key,
                type=type,
                params=None,
                is_enabled=True,
                tools=[]))
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

from enum import Enum
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Session, Mapped, mapped_column, relationship
from pydantic import TypeAdapter
from liteai_sdk import LocalServerParams, RemoteServerParams
from . import Base
from .utils import PydanticJSON

mcp_params_adapter = TypeAdapter(LocalServerParams | RemoteServerParams)

class ToolsetType(str, Enum):
    BUILTIN = "builtin"
    MCP_LOCAL = "mcp_local"
    MCP_REMOTE = "mcp_remote"

# --- --- --- --- --- ---

class Tool(Base):
    __tablename__ = "tools"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # this field is used to identify and find the specific tool in the toolset
    internal_key: Mapped[str] = mapped_column(unique=True)
    is_enabled: Mapped[bool] = mapped_column(default=True)
    auto_approve: Mapped[bool] = mapped_column(default=False)
    toolset: Mapped["Toolset"] = relationship("Toolset", back_populates="tools")
    toolset_id: Mapped[int] = mapped_column(ForeignKey("toolsets.id"))

class Toolset(Base):
    __tablename__ = "toolsets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    type: Mapped[ToolsetType]
    params: Mapped[LocalServerParams | RemoteServerParams | None] = mapped_column(PydanticJSON(mcp_params_adapter))
    is_enabled: Mapped[bool] = mapped_column(default=True)
    tools: Mapped[list["Tool"]] = relationship("Tool", back_populates="toolset", cascade="all, delete-orphan")

def init(session: Session):
    from ...agent.tools import ask_user, finish_task, FileSystemToolset

    task_control_toolset = Toolset(
        name="Task Control",
        type=ToolsetType.BUILTIN,
        is_enabled=True,
        tools=[
            Tool(name="Ask User", internal_key=ask_user.__name__, is_enabled=True, auto_approve=True),
            Tool(name="Finish Task", internal_key=finish_task.__name__, is_enabled=True, auto_approve=True),
        ])
    file_system_toolset = Toolset(
        name="File System",
        type=ToolsetType.BUILTIN,
        is_enabled=True,
        tools=[
            Tool(name="Read File", internal_key=FileSystemToolset.read_file.__name__),
            Tool(name="Write File", internal_key=FileSystemToolset.write_file.__name__),
            Tool(name="Edit File", internal_key=FileSystemToolset.edit_file.__name__),
            Tool(name="Delete File", internal_key=FileSystemToolset.delete.__name__),
            Tool(name="Copy File", internal_key=FileSystemToolset.copy.__name__),
        ])

    stmt = select(Toolset)
    has_toolsets = session.execute(stmt).scalars().first()
    if has_toolsets is not None: return

    try:
        session.add_all([task_control_toolset, file_system_toolset])
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

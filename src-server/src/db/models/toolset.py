from enum import Enum
from inspect import cleandoc
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

    assert (FileSystemToolset.read_file.__doc__ is not None and
            FileSystemToolset.read_file_batch.__doc__ is not None and
            FileSystemToolset.list_directory.__doc__ is not None and
            FileSystemToolset.write_file.__doc__ is not None and
            FileSystemToolset.edit_file.__doc__ is not None and
            FileSystemToolset.delete.__doc__ is not None and
            FileSystemToolset.copy.__doc__ is not None and
            FileSystemToolset.search_file.__doc__ is not None)

    file_system_toolset = Toolset(
        id=1,
        name="File System",
        internal_key=FileSystemToolset.__name__,
        type=ToolsetType.BUILT_IN,
        params=None,
        is_enabled=True,
        tools=[
            Tool(name="Read File", description=cleandoc(FileSystemToolset.read_file.__doc__), internal_key=FileSystemToolset.read_file.__name__),
            Tool(name="Read File Batch", description=cleandoc(FileSystemToolset.read_file_batch.__doc__), internal_key=FileSystemToolset.read_file_batch.__name__),
            Tool(name="List Directory", description=cleandoc(FileSystemToolset.list_directory.__doc__), internal_key=FileSystemToolset.list_directory.__name__),
            Tool(name="Write File", description=cleandoc(FileSystemToolset.write_file.__doc__), internal_key=FileSystemToolset.write_file.__name__),
            Tool(name="Edit File", description=cleandoc(FileSystemToolset.edit_file.__doc__), internal_key=FileSystemToolset.edit_file.__name__),
            Tool(name="Delete File", description=cleandoc(FileSystemToolset.delete.__doc__), internal_key=FileSystemToolset.delete.__name__),
            Tool(name="Copy File", description=cleandoc(FileSystemToolset.copy.__doc__), internal_key=FileSystemToolset.copy.__name__),
            Tool(name="Search File", description=cleandoc(FileSystemToolset.search_file.__doc__), internal_key=FileSystemToolset.search_file.__name__),
        ])

    assert (CodeExecutionToolset.shell.__doc__ is not None)
    code_execution_toolset = Toolset(
        id=2,
        name="Code Execution",
        internal_key=CodeExecutionToolset.__name__,
        type=ToolsetType.BUILT_IN,
        params=None,
        is_enabled=True,
        tools=[
            Tool(name="Shell", description=cleandoc(CodeExecutionToolset.shell.__doc__), internal_key=CodeExecutionToolset.shell.__name__),
        ])

    stmt = select(Toolset).where(Toolset.internal_key.in_([
        file_system_toolset.internal_key,
        code_execution_toolset.internal_key]))
    has_toolsets = session.execute(stmt).scalars().first()
    if has_toolsets is not None: return

    try:
        session.add(file_system_toolset)
        session.add(code_execution_toolset)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

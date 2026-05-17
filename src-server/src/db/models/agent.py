from typing import TYPE_CHECKING
from dais_sdk.types import ToolFn
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from . import Base, relationship
from .relationships import agent_tool_association_table

if TYPE_CHECKING:
    from .provider import LlmModel
    from .toolset import Tool
    from ...agent.tool import BuiltInToolset

class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str] = mapped_column(default="")
    # name of lucide icon, default is "bot"
    icon_name: Mapped[str] = mapped_column(default="bot")
    instruction: Mapped[str]

    model_id: Mapped[int | None] = mapped_column(ForeignKey("llm_models.id", ondelete="SET NULL"))
    model: Mapped[LlmModel | None] = relationship(foreign_keys=[model_id], viewonly=True) # readonly relationship

    usable_tools: Mapped[list[Tool]] = relationship(secondary=agent_tool_association_table)

async def init(db_session: AsyncSession):
    from .toolset import Tool, Toolset, ToolsetType
    from ...agent.tool import BuiltInToolsetContext
    from ...agent.tool.builtin_tools import (
        FileSystemToolset,
        ExecutionControlToolset,
        OsInteractionsToolset,
        UserInteractionToolset,
        WebInteractionToolset,
    )
    from ...agent.prompts.built_in_agents import (
        DAILY_ASSISTANT_AGENT_DESCRIPTION,
        DAILY_ASSISTANT_AGENT_INSTRUCTION,
        SOFTWARE_ENGINEER_AGENT_DESCRIPTION,
        SOFTWARE_ENGINEER_AGENT_INSTRUCTION,
        TERMINAL_INTERPRETER_AGENT_DESCRIPTION,
        TERMINAL_INTERPRETER_AGENT_INSTRUCTION,
    )

    builtin_toolset_ctx = BuiltInToolsetContext.default()
    builtin_toolsets: dict[type[BuiltInToolset], BuiltInToolset] = {
        toolset_t: toolset_t(builtin_toolset_ctx)
        for toolset_t in [
            FileSystemToolset,
            ExecutionControlToolset,
            OsInteractionsToolset,
            UserInteractionToolset,
            WebInteractionToolset,
        ]
    }

    def find_builtin_tool(toolset_t: type[BuiltInToolset], tool: ToolFn) -> Tool:
        toolset = builtin_toolsets[toolset_t]
        internal_key = toolset.format_tool_name(tool.__name__)
        return builtin_tools_map[internal_key]

    # check if there are any agents
    stmt = select(Agent).limit(1)
    exists = await db_session.scalar(stmt)
    if exists: return

    builtin_tools_stmt = (
        select(Tool)
        .join(Toolset, Tool.toolset_id == Toolset.id)
        .where(Toolset.type == ToolsetType.BUILT_IN)
    )
    builtin_tools = (await db_session.scalars(builtin_tools_stmt)).all()
    builtin_tools_map = {tool.internal_key: tool for tool in builtin_tools}

    ALL_TOOLS = object()
    builtin_agents = [
        (
            "Daily Assistant", "chat",
            DAILY_ASSISTANT_AGENT_DESCRIPTION,
            DAILY_ASSISTANT_AGENT_INSTRUCTION,
            [
                (UserInteractionToolset, UserInteractionToolset.ask_user),
                (ExecutionControlToolset, ExecutionControlToolset.finish_task),
                (FileSystemToolset, FileSystemToolset.read_file),
                (FileSystemToolset, FileSystemToolset.write_file),
                (FileSystemToolset, FileSystemToolset.edit_file),
                (FileSystemToolset, FileSystemToolset.list_directory),
                (FileSystemToolset, FileSystemToolset.find_files),
                (WebInteractionToolset, WebInteractionToolset.fetch),
            ],
        ),
        (
            "Terminal Interpreter", "terminal",
            TERMINAL_INTERPRETER_AGENT_DESCRIPTION,
            TERMINAL_INTERPRETER_AGENT_INSTRUCTION,
            [
                (OsInteractionsToolset, OsInteractionsToolset.shell),
                (UserInteractionToolset, UserInteractionToolset.ask_user),
                (ExecutionControlToolset, ExecutionControlToolset.finish_task),
            ],
        ),
        (
            "Software Engineer", "code-xml",
            SOFTWARE_ENGINEER_AGENT_DESCRIPTION,
            SOFTWARE_ENGINEER_AGENT_INSTRUCTION,
            ALL_TOOLS,
        ),
    ]

    for name, icon_name, description, instruction, tools in builtin_agents:
        agent = Agent(
            name=name,
            description=description,
            instruction=instruction,
            icon_name=icon_name,
            model_id=1,
            usable_tools=[],
        )
        if tools is ALL_TOOLS:
            agent.usable_tools = list(builtin_tools)
        else:
            agent.usable_tools = [find_builtin_tool(toolset_t, tool) for toolset_t, tool in tools]
        db_session.add(agent)
        await db_session.flush()

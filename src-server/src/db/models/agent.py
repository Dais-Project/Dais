from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.hybrid import hybrid_property
from . import Base
from .relationships import workspace_agent_association_table, agent_tool_association_table

if TYPE_CHECKING:
    from .provider import LlmModel
    from .workspace import Workspace
    from .task import Task
    from .toolset import Tool

class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # name of lucide icon, default is "bot"
    icon_name: Mapped[str] = mapped_column(default="bot")
    system_prompt: Mapped[str]
    model_id: Mapped[int | None] = mapped_column(ForeignKey("llm_models.id", ondelete="SET NULL"))

    _model: Mapped[LlmModel | None] = relationship(back_populates="agents",
                                                   passive_deletes=True,
                                                   lazy="joined")
    @hybrid_property
    def model(self) -> LlmModel | None: return self._model

    workspaces: Mapped[list[Workspace]] = relationship(secondary=workspace_agent_association_table,
                                                       back_populates="usable_agents",
                                                       viewonly=True)
    tasks: Mapped[list[Task]] = relationship(back_populates="_agent",
                                             viewonly=True)
    
    usable_tools: Mapped[list[Tool]] = relationship(secondary=agent_tool_association_table,
                                                    back_populates="_agents")

async def init(db_session: AsyncSession):
    from .toolset import Tool, Toolset, ToolsetType
    from ...agent.tool.builtin_tools import (
        OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset
    )
    from ...agent.prompts.built_in_agents import (
        SOFTWARE_ENGINEER_AGENT_INSTRUCTION,
        TERMINAL_INTERPRETER_AGENT_INSTRUCTION,
    )

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
        ("Terminal Interpreter", TERMINAL_INTERPRETER_AGENT_INSTRUCTION, "terminal", [
            OsInteractionsToolset.shell,
            UserInteractionToolset.ask_user,
            UserInteractionToolset.show_plan,
            ExecutionControlToolset.finish_task,
        ]),
        ("Software Engineer", SOFTWARE_ENGINEER_AGENT_INSTRUCTION, "code-xml", ALL_TOOLS),
    ]

    for name, instruction, icon_name, tools in builtin_agents:
        agent = Agent(
            name=name,
            system_prompt=instruction,
            icon_name=icon_name,
            model_id=1,
            usable_tools=[],
        )
        if tools is ALL_TOOLS:
            agent.usable_tools = list(builtin_tools)
        else:
            agent.usable_tools = [builtin_tools_map[tool.__name__] for tool in tools]
        db_session.add(agent)
        await db_session.flush()

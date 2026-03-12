from typing import TYPE_CHECKING
from sqlalchemy import select
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncSession
from . import Base
from .relationships import workspace_agent_association_table, workspace_tool_association_table

if TYPE_CHECKING:
    from .agent import Agent
    from .task import Task
    from .toolset import Tool

class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    directory: Mapped[str]
    instruction: Mapped[str]
    usable_agents: Mapped[list[Agent]] = relationship(secondary=workspace_agent_association_table,
                                                      back_populates="workspaces")
    usable_tools: Mapped[list[Tool]] = relationship(secondary=workspace_tool_association_table,
                                                    back_populates="_workspaces")

    tasks: Mapped[list[Task]] = relationship(back_populates="workspace",
                                             cascade="all, delete-orphan",
                                             viewonly=True)

async def init(db_session: AsyncSession):
    from .agent import Agent
    from .toolset import Tool, Toolset, ToolsetType

    stmt = select(Workspace).limit(1)
    exists = await db_session.scalar(stmt)
    if exists: return

    # initialize the user directory workspace
    builtin_tools_stmt = (
        select(Tool)
        .join(Toolset, Tool.toolset_id == Toolset.id)
        .where(Toolset.type == ToolsetType.BUILT_IN)
    )
    builtin_tools = (await db_session.scalars(builtin_tools_stmt)).all()
    builtin_agents = (await db_session.scalars(select(Agent))).all()
    user_directory_workspace = Workspace(
        name="User Directory",
        directory="~",
        instruction="",
        usable_agents=builtin_agents,
        usable_tools=list(builtin_tools),
    )

    db_session.add(user_directory_workspace)
    await db_session.flush()

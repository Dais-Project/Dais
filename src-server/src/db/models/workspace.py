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
    workspace_background: Mapped[str]
    usable_agents: Mapped[list[Agent]] = relationship(secondary=workspace_agent_association_table,
                                                      back_populates="workspaces")
    usable_tools: Mapped[list[Tool]] = relationship(secondary=workspace_tool_association_table,
                                                    back_populates="_workspaces")

    tasks: Mapped[list[Task]] = relationship(back_populates="workspace",
                                             cascade="all, delete-orphan",
                                             viewonly=True)

async def init(session: AsyncSession):
    user_directory_workspace = Workspace(
        name="User Directory",
        directory="~",
        workspace_background="")

    stmt = select(Workspace.id).where(
        (Workspace.name == user_directory_workspace.name) |
        (Workspace.directory == user_directory_workspace.directory)
    ).limit(1)
    exists = await session.scalar(stmt)
    if exists: return

    session.add(user_directory_workspace)
    await session.flush()

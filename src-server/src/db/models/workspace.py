from __future__ import annotations
from typing import TYPE_CHECKING
from sqlalchemy import select
from sqlalchemy.orm import Session, Mapped, mapped_column, relationship
from . import Base
from .relationships import workspace_agent_association_table

if TYPE_CHECKING:
    from .agent import Agent
    from .task import Task

class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    directory: Mapped[str]
    workspace_background: Mapped[str]
    usable_agents: Mapped[list["Agent"]] = relationship("Agent",
                                                        secondary=workspace_agent_association_table,
                                                        back_populates="workspaces")

    tasks: Mapped[list["Task"]] = relationship("Task",
                                               back_populates="workspace",
                                               cascade="all, delete-orphan",
                                               viewonly=True)

def init(session: Session):
    user_directory_workspace = Workspace(
        name="User Directory",
        directory="~",
        workspace_background="")

    stmt = select(Workspace).where(
        (Workspace.name == user_directory_workspace.name) |
        (Workspace.directory == user_directory_workspace.directory))
    exists = session.execute(stmt).scalars().first()
    if exists: return

    try:
        session.add(user_directory_workspace)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

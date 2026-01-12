from __future__ import annotations
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Session, Mapped, mapped_column, relationship, sessionmaker
from . import Base
from .provider import LlmModel
from .relationships import workspace_agent_association_table

if TYPE_CHECKING:
    from .workspace import Workspace
    from .task import Task

class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # name of lucide icon, default is "bot"
    icon_name: Mapped[str] = mapped_column(default="bot")
    system_prompt: Mapped[str]
    model_id: Mapped[int] = mapped_column(
        ForeignKey(LlmModel.id, ondelete="SET NULL"), nullable=True)
    model: Mapped["LlmModel"] = relationship("LlmModel", back_populates="agents")
    workspaces: Mapped[list["Workspace"]] = relationship(
        "Workspace",
        secondary=workspace_agent_association_table,
        back_populates="usable_agents"
    )
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="agent")

def init(session: Session):
    orchestration_agent = Agent(
        name="Orchestrator",
        model_id=1,
        system_prompt="You are a helpful assistant.")

    stmt = select(Agent).where(Agent.name == orchestration_agent.name)
    exists = session.execute(stmt).scalars().first()
    if exists: return

    try:
        session.add(orchestration_agent)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

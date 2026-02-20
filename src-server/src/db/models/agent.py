from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.hybrid import hybrid_property
from . import Base
from .relationships import workspace_agent_association_table

if TYPE_CHECKING:
    from .provider import LlmModel
    from .workspace import Workspace
    from .task import Task

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

async def init(session: AsyncSession):
    orchestration_agent = Agent(
        name="Orchestrator",
        model_id=1,
        system_prompt="You are a helpful assistant.")

    stmt = select(Agent).where(Agent.name == orchestration_agent.name).limit(1)
    exists = await session.scalar(stmt)
    if exists: return

    session.add(orchestration_agent)
    await session.flush()

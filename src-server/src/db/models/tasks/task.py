import time
from typing import TYPE_CHECKING
from dais_sdk.types import Message
from sqlalchemy import ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column
from .shared import messages_adapter, TaskUsage
from .resource import HasResources
from .. import Base, relationship
from ..utils import DataClassJSON, PydanticJSON

if TYPE_CHECKING:
    from ..agent import Agent
    from ..workspace import Workspace


class Task(HasResources, Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    usage: Mapped[TaskUsage] = mapped_column(DataClassJSON(TaskUsage), default=TaskUsage.default)
    messages: Mapped[list[Message]] = mapped_column(PydanticJSON(messages_adapter), default=list)
    last_run_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))

    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))
    agent: Mapped[Agent | None] = relationship(foreign_keys=[agent_id], viewonly=True) # readonly relationship

    _workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
    @hybrid_property
    def workspace_id(self) -> int: return self._workspace_id
    workspace: Mapped[Workspace] = relationship(foreign_keys=[_workspace_id])

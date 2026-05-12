from typing import TYPE_CHECKING
from dais_sdk.types import Message
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from .shared import messages_adapter, TaskUsage
from .resource import HasResources
from .. import Base, relationship
from ..utils import DataClassJSON, PydanticJSON

if TYPE_CHECKING:
    from .task import Task
    from ..agent import Agent


class Subtask(HasResources, Base):
    __tablename__ = "subtasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    usage: Mapped[TaskUsage] = mapped_column(DataClassJSON(TaskUsage), default=TaskUsage.default)
    messages: Mapped[list[Message]] = mapped_column(PydanticJSON(messages_adapter), default=list)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    task: Mapped[Task] = relationship(foreign_keys=[task_id], viewonly=True)

    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))
    agent: Mapped[Agent | None] = relationship(foreign_keys=[agent_id], viewonly=True) # readonly relationship

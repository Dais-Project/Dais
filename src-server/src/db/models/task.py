import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Self
from dais_sdk.types import Message
from pydantic import TypeAdapter
from sqlalchemy import ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column
from . import Base, relationship
from .utils import DataClassJSON, PydanticJSON

if TYPE_CHECKING:
    from .agent import Agent
    from .workspace import Workspace


message_adapter = TypeAdapter(Message)
messages_adapter = TypeAdapter(list[Message])

@dataclass
class TaskUsage:
    input_tokens: int
    output_tokens: int
    total_tokens: int
    max_tokens: int
    accumulated_input_tokens: int = 0
    accumulated_output_tokens: int = 0

    @classmethod
    def default(cls) -> Self:
        return cls(
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            max_tokens=0,
        )

class TaskResource(Base):
    __tablename__ = "task_resources"
    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str]
    checksum: Mapped[str]

    _task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))

class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    usage: Mapped[TaskUsage] = mapped_column(DataClassJSON(TaskUsage), default=TaskUsage.default)
    messages: Mapped[list[Message]] = mapped_column(PydanticJSON(messages_adapter), default=list)
    last_run_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))

    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))
    agent: Mapped[Agent | None] = relationship(back_populates="tasks",
                                               foreign_keys=[agent_id],
                                               viewonly=True)

    _workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    @hybrid_property
    def workspace_id(self) -> int: return self._workspace_id
    workspace: Mapped[Workspace] = relationship(back_populates="_tasks",
                                                foreign_keys=[_workspace_id],
                                                viewonly=True)

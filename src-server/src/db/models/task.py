from __future__ import annotations

import enum
import time
from typing import Annotated, TYPE_CHECKING
from liteai_sdk import SystemMessage, UserMessage, AssistantMessage, ToolMessage
from pydantic import Discriminator, TypeAdapter
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
from .utils import PydanticJSON

if TYPE_CHECKING:
    from .agent import Agent
    from .workspace import Workspace

TaskMessage = Annotated[
    UserMessage | AssistantMessage | SystemMessage | ToolMessage,
    Discriminator("role")
]
message_adapter = TypeAdapter(TaskMessage)
messages_adapter = TypeAdapter(list[TaskMessage])

class TaskType(str, enum.Enum):
    Agent = "agent"
    Orchestration = "orchestration"
    CodeExecution = "code_execution"

class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[TaskType]
    title: Mapped[str]
    messages: Mapped[list[TaskMessage]] = mapped_column(PydanticJSON(messages_adapter), default=list)
    last_run_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))

    agent: Mapped["Agent"] = relationship("Agent",
                                          back_populates="tasks",
                                          viewonly=True)
    workspace: Mapped["Workspace"] = relationship("Workspace",
                                                  back_populates="tasks",
                                                  viewonly=True)

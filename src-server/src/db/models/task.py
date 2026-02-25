import time
from dataclasses import dataclass
from enum import Enum
from typing import Annotated, TYPE_CHECKING, Self
from dais_sdk import SystemMessage, UserMessage, AssistantMessage, ToolMessage
from pydantic import Discriminator, TypeAdapter
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property
from . import Base
from .utils import DataClassJSON, PydanticJSON

if TYPE_CHECKING:
    from .agent import Agent
    from .workspace import Workspace

TaskMessage = Annotated[
    UserMessage | AssistantMessage | SystemMessage | ToolMessage,
    Discriminator("role")
]
message_adapter = TypeAdapter(TaskMessage)
messages_adapter = TypeAdapter(list[TaskMessage])

class TaskType(str, Enum):
    Agent = "agent"
    Orchestration = "orchestration"
    CodeWorkflow = "code_workflow"

@dataclass
class TaskUsage:
    input_tokens: int
    output_tokens: int
    total_tokens: int
    max_tokens: int

    @classmethod
    def default(cls) -> Self:
        return cls(
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            max_tokens=0,
        )

class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[TaskType]
    title: Mapped[str]
    usage: Mapped[TaskUsage] = mapped_column(DataClassJSON(TaskUsage), default=TaskUsage.default)
    messages: Mapped[list[TaskMessage]] = mapped_column(PydanticJSON(messages_adapter), default=list)
    last_run_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))

    _workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    @hybrid_property
    def workspace_id(self) -> int: return self._workspace_id
    _agent: Mapped[Agent | None] = relationship(back_populates="tasks",
                                                passive_deletes=True)
    @hybrid_property
    def agent(self) -> Agent | None: return self._agent
    workspace: Mapped[Workspace] = relationship(back_populates="tasks",
                                                viewonly=True)

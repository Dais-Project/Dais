import time
from typing import TYPE_CHECKING, Annotated, Literal
from dais_sdk.types import Message
from pydantic import BaseModel, Field, TypeAdapter
from sqlalchemy import ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column
from .resource import HasResources
from .shared import TaskUsage, messages_adapter
from .. import Base, relationship
from ..utils import DataClassJSON, PydanticJSON

if TYPE_CHECKING:
    from ..agent import Agent
    from ..workspace import Workspace


class CronConfig(BaseModel):
    type: Literal["cron"]
    expression: str # e.g. "0 9 * * 1"

class PollingConfig(BaseModel):
    type: Literal["polling"]
    interval_sec: int

class DelayedConfig(BaseModel):
    type: Literal["delayed"]
    run_at: int

ScheduleConfig = Annotated[
    CronConfig | PollingConfig | DelayedConfig,
    Field(discriminator="type"),
]

schedule_config_adapter = TypeAdapter(ScheduleConfig)

class RunRecord(HasResources, Base):
    __tablename__ = "run_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    usage: Mapped[TaskUsage] = mapped_column(DataClassJSON(TaskUsage), default=TaskUsage.default)
    messages: Mapped[list[Message]] = mapped_column(PydanticJSON(messages_adapter), default=list)

    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id", ondelete="CASCADE"))
    schedule: Mapped[Schedule] = relationship(back_populates="run_records", foreign_keys=[schedule_id])

class Schedule(Base):
    __tablename__ = "schedules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    is_enabled: Mapped[bool]

    task: Mapped[str]
    config: Mapped[ScheduleConfig] = mapped_column(PydanticJSON(schedule_config_adapter))

    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"))
    agent: Mapped[Agent | None] = relationship(foreign_keys=[agent_id], viewonly=True)

    _workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    @hybrid_property
    def workspace_id(self) -> int: return self._workspace_id
    workspace: Mapped[Workspace] = relationship(foreign_keys=[_workspace_id], viewonly=True)

    run_records: Mapped[list[RunRecord]] = relationship(back_populates="schedule", cascade="all, delete-orphan")

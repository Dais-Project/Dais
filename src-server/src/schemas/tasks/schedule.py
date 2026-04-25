from src.db.models.tasks.schedule import ScheduleConfig
from .. import DTOBase


class ScheduleBase(DTOBase):
    name: str
    config: ScheduleConfig


class ScheduleBrief(ScheduleBase):
    id: int
    agent_id: int | None
    workspace_id: int


class ScheduleRead(ScheduleBase):
    id: int
    agent_id: int | None
    workspace_id: int


class ScheduleCreate(ScheduleBase):
    agent_id: int | None
    workspace_id: int


class ScheduleUpdate(DTOBase):
    name: str | None
    config: ScheduleConfig | None
    agent_id: int | None

from dais_sdk.types import Message
from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import ScheduleConfig
from .. import DTOBase


class ScheduleBase(DTOBase):
    name: str
    task: str
    is_enabled: bool
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
    task: str | None
    is_enabled: bool | None
    config: ScheduleConfig | None
    agent_id: int | None

# --- --- --- --- --- ---

class RunRecordBase(DTOBase):
    run_at: int
    usage: task_models.TaskUsage
    messages: list[Message]
    schedule_id: int

class RunRecordBrief(RunRecordBase):
    id: int

class RunRecordRead(RunRecordBase):
    id: int

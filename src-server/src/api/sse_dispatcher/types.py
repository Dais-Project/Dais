from src.agent.types import ScheduleRunCompletedEvent, TaskExecutorChangedEvent
from src.services.resource_events import ResourceChangedEvent


type DispatcherEventData = (
    ScheduleRunCompletedEvent
    | TaskExecutorChangedEvent
    | ResourceChangedEvent
)

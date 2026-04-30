from src.agent.types import ScheduleRunCompletedEvent


# type DispatcherEventData = Annotated[
#     ScheduleRunCompletedEvent | None,
#     Discriminator("event_id")
# ]
type DispatcherEventData = ScheduleRunCompletedEvent

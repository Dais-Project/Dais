from collections.abc import Callable
from typing import Annotated, Self
from typing import Literal

from pydantic import BaseModel
from pydantic import Field


type ResourceOperation = Literal["created", "deleted"]

class ResourceChangedEventBase(BaseModel):
    event_id: Literal["RESOURCE_CHANGED"]
    operation: ResourceOperation
    resource_id: int
    client_id: str | None = None

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   **kwargs)

class WorkspaceChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["workspace"]

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="workspace",
                   **kwargs)

class AgentChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["agent"]

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="agent",
                   **kwargs)

class ProviderChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["provider"]

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="provider",
                   **kwargs)

class SkillChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["skill"]

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="skill",
                   **kwargs)

class ToolsetChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["toolset"]

    @classmethod
    def build(cls,
            operation: ResourceOperation,
            resource_id: int,
            **kwargs) -> Self:
        return cls(event_id="RESOURCE_CHANGED",
                operation=operation,
                resource_id=resource_id,
                resource_type="toolset",
                **kwargs)

class TaskChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["task"]
    workspace_id: int

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        assert "workspace_id" in kwargs
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="task",
                   **kwargs)

class ScheduleChangedEvent(ResourceChangedEventBase):
    resource_type: Literal["schedule"]
    workspace_id: int

    @classmethod
    def build(cls,
              operation: ResourceOperation,
              resource_id: int,
              **kwargs) -> Self:
        assert "workspace_id" in kwargs
        return cls(event_id="RESOURCE_CHANGED",
                   operation=operation,
                   resource_id=resource_id,
                   resource_type="schedule",
                   **kwargs)

type ResourceChangedEvent = Annotated[
    WorkspaceChangedEvent
    | AgentChangedEvent
    | ProviderChangedEvent
    | SkillChangedEvent
    | ToolsetChangedEvent
    | TaskChangedEvent
    | ScheduleChangedEvent,
    Field(discriminator="resource_type"),
]


class ResourceEventCollector:
    def __init__(self):
        self._events: list[ResourceChangedEvent] = []

    def collect(self, event: ResourceChangedEvent):
        self._events.append(event)

    def drain(self) -> list[ResourceChangedEvent]:
        events = self._events.copy()
        self._events.clear()
        return events


type ResourceEventHandler = Callable[[ResourceChangedEvent], None]


def ignore_resource_event(_: ResourceChangedEvent):
    pass

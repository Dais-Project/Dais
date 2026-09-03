import pytest
from pydantic import ValidationError

from src.services.resource_events import TaskChangedEvent, WorkspaceChangedEvent, ResourceEventCollector


def test_resource_event_collector_drains_events():
    collector = ResourceEventCollector()
    event = WorkspaceChangedEvent.build(
        operation="created",
        resource_id=1,
    )

    collector.collect(event)

    assert collector.drain() == [event]
    assert collector.drain() == []


def test_task_changed_event_requires_workspace_id():
    with pytest.raises(ValidationError):
        TaskChangedEvent.model_validate({
            "event_id": "RESOURCE_CHANGED",
            "resource_type": "task",
            "operation": "created",
            "resource_id": 1,
        })

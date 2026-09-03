from typing import Annotated

from fastapi import Depends, Request

from src.services.resource_events import ResourceEventCollector, ResourceEventHandler


def get_resource_event_collector(request: Request) -> ResourceEventCollector:
    return request.state.resource_event_collector


def get_resource_event_handler(
    collector: Annotated[ResourceEventCollector, Depends(get_resource_event_collector)],
) -> ResourceEventHandler:
    return collector.collect


ResourceEventHandlerDep = Annotated[
    ResourceEventHandler,
    Depends(get_resource_event_handler),
]

from typing import Annotated

from fastapi import Depends, Request

from src.services.resource_events import ResourceChangedEvent, ResourceEventCollector, ResourceEventHandler


def get_resource_event_collector(request: Request) -> ResourceEventCollector:
    return request.state.resource_event_collector

def get_resource_event_handler(
    request: Request,
    collector: Annotated[ResourceEventCollector, Depends(get_resource_event_collector)],
) -> ResourceEventHandler:
    client_id = request.headers.get("X-Client-ID")

    def collect(event: ResourceChangedEvent):
        event.client_id = client_id
        collector.collect(event)

    return collect

ResourceEventHandlerDep = Annotated[
    ResourceEventHandler,
    Depends(get_resource_event_handler),
]

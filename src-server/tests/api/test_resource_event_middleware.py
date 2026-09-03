from types import SimpleNamespace

import pytest

from src.api.middlewares.resource_events import ResourceEventMiddleware
from src.services.resource_events import AgentChangedEvent, SkillChangedEvent, ToolsetChangedEvent, ResourceEventCollector


@pytest.mark.asyncio
async def test_dispatch_sends_collected_events_for_successful_response(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    collector = ResourceEventCollector()
    event = AgentChangedEvent.build(
        operation="deleted",
        resource_id=3,
    )
    collector.collect(event)
    request = SimpleNamespace(state=SimpleNamespace(
        resource_event_collector=collector,
        sse_dispatcher=dispatcher,
    ))
    response = SimpleNamespace(status_code=204)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    dispatcher.send.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_dispatch_does_not_send_events_for_error_response(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    collector = ResourceEventCollector()
    collector.collect(SkillChangedEvent.build(
        operation="created",
        resource_id=5,
    ))
    request = SimpleNamespace(state=SimpleNamespace(
        resource_event_collector=collector,
        sse_dispatcher=dispatcher,
    ))
    response = SimpleNamespace(status_code=409)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    dispatcher.send.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_keeps_response_when_sse_send_fails(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    dispatcher.send.side_effect = RuntimeError("SSE unavailable")
    collector = ResourceEventCollector()
    collector.collect(ToolsetChangedEvent.build(
        operation="deleted",
        resource_id=8,
    ))
    request = SimpleNamespace(state=SimpleNamespace(
        resource_event_collector=collector,
        sse_dispatcher=dispatcher,
    ))
    response = SimpleNamespace(status_code=204)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    dispatcher.send.assert_awaited_once()

from types import SimpleNamespace

import pytest

from src.api.middlewares.resource_events import ResourceEventMiddleware
from src.services.resource_events import (
    AgentChangedEvent,
    SkillChangedEvent,
    ToolsetChangedEvent,
)


@pytest.mark.asyncio
async def test_dispatch_sends_collected_events_for_successful_response(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    request = SimpleNamespace(state=SimpleNamespace(sse_dispatcher=dispatcher))
    response = SimpleNamespace(status_code=204)
    event = AgentChangedEvent.build(
        operation="deleted",
        resource_id=3,
    )

    async def call_next(received_request):
        received_request.state.resource_event_collector.collect(event)
        return response

    result = await middleware.dispatch(request, call_next)

    assert result is response
    dispatcher.send.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_dispatch_does_not_send_events_for_error_response(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    request = SimpleNamespace(state=SimpleNamespace(sse_dispatcher=dispatcher))
    response = SimpleNamespace(status_code=409)
    event = SkillChangedEvent.build(
        operation="created",
        resource_id=5,
    )

    async def call_next(received_request):
        received_request.state.resource_event_collector.collect(event)
        return response

    result = await middleware.dispatch(request, call_next)

    assert result is response
    dispatcher.send.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_keeps_response_when_sse_send_fails(mocker):
    middleware = ResourceEventMiddleware(mocker.Mock())
    dispatcher = mocker.AsyncMock()
    dispatcher.send.side_effect = RuntimeError("SSE unavailable")
    request = SimpleNamespace(state=SimpleNamespace(sse_dispatcher=dispatcher))
    response = SimpleNamespace(status_code=204)
    event = ToolsetChangedEvent.build(
        operation="deleted",
        resource_id=8,
    )

    async def call_next(received_request):
        received_request.state.resource_event_collector.collect(event)
        return response

    result = await middleware.dispatch(request, call_next)

    assert result is response
    dispatcher.send.assert_awaited_once()

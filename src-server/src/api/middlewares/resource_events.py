from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request

from src.services.resource_events import ResourceEventCollector

from ..sse_dispatcher import SseDispatcher


class ResourceEventMiddleware(BaseHTTPMiddleware):
    _logger = logger.bind(name="ResourceEventMiddleware")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        collector = ResourceEventCollector()
        request.state.resource_event_collector = collector

        response = await call_next(request)
        if response.status_code >= 400:
            return response

        dispatcher: SseDispatcher = request.state.sse_dispatcher
        for event in collector.drain():
            try:
                await dispatcher.send(event)
            except Exception:
                self._logger.exception("Failed to dispatch resource change event")

        return response

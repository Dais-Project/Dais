from fastapi import APIRouter
from sse_starlette import EventSourceResponse
from ..sse_dispatcher import SseDispatcher, SseDispatcherDep

sse_router = APIRouter(tags=["stream"])

async def sse_stream(sse_dispatcher: SseDispatcher):
    async for event in sse_dispatcher.listen():
        yield event

@sse_router.post("/")
async def sse_endpoint(sse_dispatcher: SseDispatcherDep):
    return EventSourceResponse(
        sse_stream(sse_dispatcher),
        ping=30,
        headers={"Cache-Control": "no-cache"})

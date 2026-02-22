from typing import Annotated
from fastapi import APIRouter, Depends, Request
from sse_starlette import EventSourceResponse
from ..sse_dispatcher import SseDispatcher

sse_router = APIRouter(tags=["stream"])

def get_sse_dispatcher(request: Request) -> SseDispatcher:
    return request.state.sse_dispatcher
SseDispatcherDep = Annotated[SseDispatcher, Depends(get_sse_dispatcher)]

async def sse_stream(sse_dispatcher: SseDispatcher):
    async for event in sse_dispatcher.listen():
        yield event

async def sse_endpoint(sse_dispatcher: SseDispatcherDep):
    return EventSourceResponse(
        sse_stream(sse_dispatcher),
        ping=30,
        headers={"Cache-Control": "no-cache"})

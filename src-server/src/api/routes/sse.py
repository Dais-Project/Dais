from collections.abc import AsyncIterable
from fastapi import APIRouter
from fastapi.sse import EventSourceResponse
from ..sse_dispatcher import SseDispatcherDep
from ..sse_dispatcher.types import DispatcherEventData


sse_router = APIRouter(tags=["stream"])

@sse_router.post(
    "/",
    responses={ 200: {"model": DispatcherEventData} },
    response_class=EventSourceResponse,
)
async def sse_endpoint(sse_dispatcher: SseDispatcherDep) -> AsyncIterable[DispatcherEventData]:
    async for data in sse_dispatcher.listen():
        yield data

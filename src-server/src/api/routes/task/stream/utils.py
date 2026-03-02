import asyncio
from dataclasses import asdict
from loguru import logger
from fastapi import Request
from sse_starlette import EventSourceResponse, ServerSentEvent, JSONServerSentEvent
from dais_sdk import TextChunk, UsageChunk, ToolCallChunk
from .types import SseGenerator
from ....types import EmptyServerSentEvent
from .....agent.task import AgentTask
from .....agent.types import (
    AgentGenerator,
    AgentEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent, MessageReplaceEvent,
    ToolCallEndEvent, ToolExecutedEvent, ToolRequireUserResponseEvent, ToolRequirePermissionEvent,
    ErrorEvent
)

_logger = logger.bind(name="TaskStreamRoute")

def create_stream_response(gen: SseGenerator) -> EventSourceResponse:
    return EventSourceResponse(gen, headers={"Cache-Control": "no-cache"})

def agent_event_format(task: AgentTask, event: AgentEvent) -> ServerSentEvent | None:
    match event:
        case MessageStartEvent(message_id=message_id):
            return JSONServerSentEvent(event=event.event_id, data={
                "message_id": message_id,
            })
        case MessageChunkEvent(chunk):
            match chunk:
                case TextChunk(content):
                    return JSONServerSentEvent(event=event.event_id, data={
                        "type": "text",
                        "content": content,
                    })
                case UsageChunk() as chunk:
                    return JSONServerSentEvent(event=event.event_id, data={
                        "type": "usage",
                        "max_tokens": task._ctx.model.context_size,
                        **asdict(chunk),
                    })
                case ToolCallChunk() as chunk:
                    return JSONServerSentEvent(event=event.event_id, data={
                        "type": "tool_call",
                        "data": asdict(chunk),
                    })
        case MessageEndEvent(message) | MessageReplaceEvent(message) | ToolCallEndEvent(message):
            return JSONServerSentEvent(event=event.event_id, data={
                "message": message.model_dump(),
            })
        case ToolExecutedEvent(tool_call_id, result):
            return JSONServerSentEvent(event=event.event_id, data={
                "tool_call_id": tool_call_id,
                "result": result,
            })
        case ToolRequireUserResponseEvent(tool_name):
            return JSONServerSentEvent(event=event.event_id, data={
                "tool_name": tool_name,
            })
        case ToolRequirePermissionEvent(tool_call_id):
            return JSONServerSentEvent(event=event.event_id, data={
                "tool_call_id": tool_call_id,
            })
        case TaskDoneEvent() | TaskInterruptedEvent() as event:
            return EmptyServerSentEvent(event=event.event_id)
        case ErrorEvent(error):
            return JSONServerSentEvent(event=event.event_id, data={
                "message": str(error),
            })
        case _:
            _logger.warning(f"Unknown event: {event}")
            return None

async def agent_stream(task: AgentTask, request: Request) -> AgentGenerator:
    pending_terminal_event = None
    try:
        async for event in task.run():
            if await request.is_disconnected():
                task.stop()
                break

            if isinstance(event, (TaskDoneEvent, TaskInterruptedEvent)):
                pending_terminal_event = event
                continue
            yield event
    except asyncio.CancelledError:
        task.stop()
        raise
    except GeneratorExit:
        task.stop()
        raise
    except Exception as e:
        _logger.exception("Error in agent stream")
        yield ErrorEvent(e)
    finally:
        try:
            # ensure task is persisted before yielding terminal event
            await asyncio.shield(task.persist())
        except Exception as e:
            _logger.exception("Failed to persist task state in stream finalization")

    if await request.is_disconnected():
        return

    if pending_terminal_event is None:
        _logger.warning("No terminal event yielded")
        pending_terminal_event = TaskDoneEvent()
    yield pending_terminal_event

async def agent_sse_stream(task: AgentTask, request: Request) -> SseGenerator:
    async for event in agent_stream(task, request):
        sse_event = agent_event_format(task, event)
        if sse_event is not None:
            yield sse_event

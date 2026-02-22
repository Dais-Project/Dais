from collections.abc import AsyncGenerator
from dataclasses import asdict
from loguru import logger
from fastapi import Request
from sse_starlette import ServerSentEvent, JSONServerSentEvent
from dais_sdk import TextChunk, UsageChunk, ToolCallChunk
from ....types import EmptyServerSentEvent
from .....agent.task import AgentTask
from .....agent.types import (
    AgentEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent, MessageReplaceEvent,
    ToolCallEndEvent, ToolExecutedEvent, ToolRequireUserResponseEvent, ToolRequirePermissionEvent,
    ErrorEvent
)

AgentGenerator = AsyncGenerator[ServerSentEvent | None, None]

_logger = logger.bind(name="TaskStreamRoute")

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
    """
    Process agent event stream and convert to SSE format
    """
    try:
        async for event in task.run():
            if await request.is_disconnected():
                task.stop()
                break

            yield agent_event_format(task, event)
            if isinstance(event, ErrorEvent):
                _logger.error(f"Task failed: {event.error}")
                _logger.debug("Task openai messages: {}",
                             [m.to_litellm_message() for m in task._ctx.messages])
                break
    except Exception as e:
        _logger.exception("Error in agent stream")
        yield JSONServerSentEvent(event="error", data={"message": str(e)})
    finally:
        await task.persist()

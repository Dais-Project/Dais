from collections.abc import AsyncGenerator
from dataclasses import asdict
from typing import Literal
from loguru import logger
from fastapi import APIRouter, Request
from sse_starlette import EventSourceResponse, ServerSentEvent, JSONServerSentEvent
from dais_sdk import TextChunk, UsageChunk, ToolCallChunk, UserMessage
from pydantic import BaseModel
from ..types import EmptyServerSentEvent
from ....agent import AgentTask
from ....agent.types import (
    AgentEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent, MessageReplaceEvent,
    ToolCallEndEvent, ToolExecutedEvent, ToolRequireUserResponseEvent, ToolRequirePermissionEvent,
    ErrorEvent
)
from ....services.task import TaskService

_logger = logger.bind(name="TaskStreamRoute")
AgentGenerator = AsyncGenerator[ServerSentEvent | None, None]

class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class ContinueTaskBody(TaskStreamBody):
    message: UserMessage | None = None

class ToolAnswerBody(TaskStreamBody):
    tool_call_id: str
    answer: str

class ToolReviewBody(TaskStreamBody):
    tool_call_id: str
    status: Literal["approved", "denied"]
    auto_approve: bool = False

def retrive_task(task_id: int, agent_id: int) -> AgentTask:
    with TaskService() as task_service:
        task = task_service.get_task_by_id(task_id)
        task.agent_id = agent_id
    return AgentTask(task)

def create_stream_response(stream: AgentGenerator) -> EventSourceResponse:
    gen = (item async for item in stream if item is not None)
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
        case MessageEndEvent(message):
            return JSONServerSentEvent(event=event.event_id, data={
                "message": message.model_dump(),
            })
        case MessageReplaceEvent(message):
            return JSONServerSentEvent(event=event.event_id, data={
                "message": message.model_dump(),
            })
        case ToolCallEndEvent(message):
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
        case TaskDoneEvent():
            return EmptyServerSentEvent(event=event.event_id)
        case TaskInterruptedEvent():
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
                             [m.to_litellm_message() for m in task._messages])
                break
    except Exception as e:
        _logger.exception("Error in agent stream")
        yield JSONServerSentEvent(event="error", data={"message": str(e)})
    finally:
        task.persist()

# --- --- --- --- --- ---

task_stream_router = APIRouter(tags=["task-internal"])

@task_stream_router.post("/{task_id}/continue")
async def continue_task(task_id: int, body: ContinueTaskBody, request: Request) -> EventSourceResponse:
    """
    This endpoint is used to directly continue the existing task,
    or continue with a new UserMessage
    """
    task = retrive_task(task_id, body.agent_id)

    async def temp_stream() -> AgentGenerator:
        if body.message is not None:
            task.append_message(body.message)
        async for event in agent_stream(task, request):
            yield event

    return create_stream_response(temp_stream())

@task_stream_router.post("/{task_id}/tool_answer")
async def tool_answer(task_id: int, body: ToolAnswerBody, request: Request) -> EventSourceResponse:
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = retrive_task(task_id, body.agent_id)
    changed_message = task.set_tool_call_result(body.tool_call_id, body.answer)

    async def temp_stream() -> AgentGenerator:
        yield agent_event_format(task, MessageReplaceEvent(changed_message))
        async for event in agent_stream(task, request):
            yield event

    return create_stream_response(temp_stream())

@task_stream_router.post("/{task_id}/tool_reviews")
async def tool_reviews(task_id: int, body: ToolReviewBody, request: Request) -> EventSourceResponse:
    """
    This endpoint is used to submit the tool call permissions.
    """
    task = retrive_task(task_id, body.agent_id)

    async def temp_stream() -> AgentGenerator:
        tool_event, replace_event = await task.approve_tool_call(
                                          body.tool_call_id, body.status == "approved")

        if replace_event is not None:
            yield agent_event_format(task, replace_event)
        if tool_event is not None:
            yield agent_event_format(task, tool_event)

        async for event in agent_stream(task, request):
            yield event

    return create_stream_response(temp_stream())

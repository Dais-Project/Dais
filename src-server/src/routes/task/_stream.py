from collections.abc import Generator
from dataclasses import asdict
from typing import Literal
from loguru import logger
from flask import Response, stream_with_context
from liteai_sdk import TextChunk, UsageChunk, ToolCallChunk, UserMessage
from pydantic import BaseModel
from flask_pydantic import validate
from .blueprint import tasks_bp
from ..types import FlaskResponse
from ...agent import AgentTask
from ...agent.types import (
    AgentEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent, ToolRequireUserResponseEvent,
    ToolRequirePermissionEvent, ErrorEvent
)
from ...services.task import TaskService
from ...utils.sse import format_sse

_logger = logger.bind(name="TaskStreamRoute")

def create_stream_response(stream: Generator[str, None, None]) -> FlaskResponse:
    return Response(stream_with_context(stream), mimetype="text/event-stream")

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
    status: Literal["approve", "deny"]
    auto_approve: bool = False

def retrive_task(task_id: int, agent_id: int) -> AgentTask:
    with TaskService() as task_service:
        task = task_service.get_task_by_id(task_id)
        task.agent_id = agent_id
    return AgentTask(task)

def agent_event_format(task: AgentTask, event: AgentEvent) -> str | None:
    match event:
        case MessageChunkEvent(chunk):
            match chunk:
                case TextChunk(content):
                    return format_sse(event=event.event_id, data={
                        "type": "text",
                        "content": content,
                    })
                case UsageChunk() as chunk:
                    return format_sse(event=event.event_id, data={
                        "type": "usage",
                        "max_tokens": task._ctx.model.context_size,
                        **asdict(chunk),
                    })
                case ToolCallChunk() as chunk:
                    return format_sse(event=event.event_id, data={
                        "type": "tool_call",
                        "data": asdict(chunk),
                    })
        case MessageStartEvent():
            return format_sse(event=event.event_id, data=None)
        case MessageEndEvent():
            return format_sse(event=event.event_id, data=None)
        case ToolExecutedEvent(tool_call_id=tool_call_id, result=result):
            return format_sse(event=event.event_id, data={
                "tool_call_id": tool_call_id,
                "result": result,
            })
        case ToolRequireUserResponseEvent(tool_name=tool_name):
            return format_sse(event=event.event_id, data={
                "tool_name": tool_name,
            })
        case ToolRequirePermissionEvent(tool_call_id=tool_call_id):
            return format_sse(event=event.event_id, data={
                "tool_call_id": tool_call_id,
            })
        case TaskDoneEvent():
            return format_sse(event=event.event_id, data=None)
        case TaskInterruptedEvent():
            return format_sse(event=event.event_id, data=None)
        case ErrorEvent(error=error):
            return format_sse(event=event.event_id, data={"message": str(error)})
        case _:
            _logger.warning(f"Unknown event: {event}")
            return None

def agent_stream(task: AgentTask) -> Generator[str]:
    """
    Process agent event stream and convert to SSE format
    """
    try:
        for event in task.run():
            if (formatted_event := agent_event_format(task, event)) is not None:
                yield formatted_event
            if isinstance(event, ErrorEvent):
                _logger.error(f"Task failed: {event.error}")
                _logger.debug("Task openai messages: {}",
                                [m.to_litellm_message() for m in task._messages])
                break
    except GeneratorExit:
        # When client disconnects
        task.stop()
    finally:
        task.persist()

@tasks_bp.route("/<int:task_id>/continue", methods=["POST"])
@validate()
def continue_task(task_id: int, body: ContinueTaskBody) -> FlaskResponse:
    """
    This endpoint is used to directly continue the existing task,
    or continue with a new UserMessage
    """
    task = retrive_task(task_id, body.agent_id)
    if body.message is not None:
        task.append_message(body.message)

    return create_stream_response(agent_stream(task))

@tasks_bp.route("/<int:task_id>/tool_answer", methods=["POST"])
@validate()
def tool_answer(task_id: int, body: ToolAnswerBody) -> FlaskResponse:
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = retrive_task(task_id, body.agent_id)
    task.set_tool_call_result(body.tool_call_id, body.answer)
    return create_stream_response(agent_stream(task))

@tasks_bp.route("/<int:task_id>/tool_reviews", methods=["POST"])
@validate()
def tool_reviews(task_id: int, body: ToolReviewBody) -> FlaskResponse:
    """
    This endpoint is used to submit the tool call permissions.
    """
    task = retrive_task(task_id, body.agent_id)

    def temp_stream() -> Generator[str]:
        tool_event = task.approve_tool_call(body.tool_call_id, body.status == "approve")
        if tool_event is not None:
            if (formatted_event := agent_event_format(task, tool_event)) is not None:
                yield formatted_event
        yield from agent_stream(task)
    return create_stream_response(temp_stream())

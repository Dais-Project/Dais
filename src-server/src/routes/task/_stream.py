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
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent, ToolRequireUserResponseEvent,
    ToolRequirePermissionEvent, ErrorEvent
)
from ...services.task import TaskService
from ...db.schemas import task as task_schemas
from ...utils.sse import format_sse

_logger = logger.bind(name="TaskStreamRoute")

class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class ContinueTaskBody(TaskStreamBody):
    message: UserMessage | None = None

class ToolAnswerBody(TaskStreamBody):
    tool_call_id: str
    answer: str

class ToolReviewBody(TaskStreamBody):
    status: Literal["approve", "deny"]
    auto_approve: bool = False

def retrive_task(task_id: int, agent_id: int) -> AgentTask:
    with TaskService() as task_service:
        task = task_service.get_task_by_id(task_id)
        if task is None:
            raise ValueError(f"Task {task_id} not found")
        task.agent_id = agent_id

    return AgentTask(task)

def agent_stream(task: AgentTask) -> Generator[str]:
    """
    Process agent event stream and convert to SSE format
    """
    try:
        for event in task.run():
            match event:
                case MessageChunkEvent(chunk):
                    match chunk:
                        case TextChunk(content):
                            yield format_sse(event=event.event_id, data={
                                "type": "text",
                                "content": content,
                            })
                        case UsageChunk() as chunk:
                            yield format_sse(event=event.event_id, data={
                                "type": "usage",
                                "max_tokens": task._ctx.model.context_size,
                                **asdict(chunk),
                            })
                        case ToolCallChunk() as chunk:
                            yield format_sse(event=event.event_id, data={
                                "type": "tool_call",
                                "data": asdict(chunk),
                            })

                case MessageStartEvent():
                    yield format_sse(event=event.event_id, data=None)

                case MessageEndEvent():
                    yield format_sse(event=event.event_id, data=None)

                case ToolExecutedEvent(tool_call_id=tool_call_id, result=result):
                    yield format_sse(event=event.event_id, data={
                        "tool_call_id": tool_call_id,
                        "result": result,
                    })

                case ToolRequireUserResponseEvent(tool_name=tool_name):
                    yield format_sse(event=event.event_id, data={
                        "tool_name": tool_name,
                    })

                case ToolRequirePermissionEvent(tool_call_id=tool_call_id):
                    yield format_sse(event=event.event_id, data={
                        "tool_call_id": tool_call_id,
                    })

                case TaskDoneEvent():
                    yield format_sse(event=event.event_id, data=None)

                case TaskInterruptedEvent():
                    yield format_sse(event=event.event_id, data=None)

                case ErrorEvent(error=error):
                    _logger.error(f"Task failed: {error}")
                    _logger.debug("Task openai messages: {}",
                                 [m.to_litellm_message() for m in task._messages])
                    yield format_sse(event=event.event_id, data={"message": str(error)})
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

    return Response(stream_with_context(agent_stream(task)),
                    mimetype="text/event-stream")

@tasks_bp.route("/<int:task_id>/tool_answer", methods=["POST"])
@validate()
def tool_answer(task_id: int, body: ToolAnswerBody) -> FlaskResponse:
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = retrive_task(task_id, body.agent_id)
    task.set_tool_call_result(body.tool_call_id, body.answer)
    return Response(stream_with_context(agent_stream(task)),
                    mimetype="text/event-stream")

@tasks_bp.route("/<int:task_id>/tool_reviews", methods=["POST"])
@validate()
def tool_reviews(task_id: int, body: ToolReviewBody) -> FlaskResponse:
    """
    This endpoint is used to submit the tool call permissions.
    """
    # TODO: Implement tool_reviews logic
    ...

from collections.abc import Generator
from dataclasses import asdict
from loguru import logger
from flask import Blueprint, Response, jsonify, stream_with_context
from liteai_sdk import TextChunk, UsageChunk, ToolCallChunk, UserMessage
from pydantic import BaseModel
from flask_pydantic import validate
from .types import FlaskResponse, PaginatedResponse
from ..agent import AgentTask, AgentTaskPool
from ..agent.types import (
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent, ToolRequireUserResponseEvent,
    ToolRequirePermissionEvent, ErrorEvent
)
from ..services.task import TaskService
from ..db.schemas import task as task_schemas
from ..utils.sse import format_sse

tasks_bp = Blueprint("tasks", __name__)
task_pool = AgentTaskPool()
_logger = logger.bind(name="TaskRoute")

class TasksQueryModel(BaseModel):
    workspace_id: int
    page: int = 1
    per_page: int = 15

@tasks_bp.route("/", methods=["GET"])
@validate()
def get_tasks(query: TasksQueryModel) -> FlaskResponse:
    with TaskService() as service:
        result = service.get_tasks(query.workspace_id, query.page, query.per_page)

        serialized_items = [
            task_schemas.TaskRead
                        .model_validate(task)
                        .model_dump(mode="json")
            for task in result["items"]
        ]
        return jsonify(PaginatedResponse[dict](
            items=serialized_items,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        ))

@tasks_bp.route("/<int:task_id>", methods=["GET"])
def get_task(task_id: int) -> FlaskResponse:
    with TaskService() as service:
        task = service.get_task_by_id(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(task_schemas.TaskRead
                                   .model_validate(task)
                                   .model_dump(mode="json"))

@tasks_bp.route("/", methods=["POST"])
@validate()
def new_task(body: task_schemas.TaskCreate) -> FlaskResponse:
    with TaskService() as service:
        new_task = service.create_task(body)
        return jsonify(task_schemas.TaskRead
                                   .model_validate(new_task)
                                   .model_dump(mode="json")), 201

@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
def delete_task(task_id: int) -> FlaskResponse:
    if not task_pool.has(task_id):
        return jsonify({"error": "Task not found"}), 404

    task_pool.stop(task_id)
    with TaskService() as service:
        service.delete_task(task_id)
        return Response(status=204)

# --- --- --- --- --- ---
# -- Streaming Routes ---
# --- --- --- --- --- ---

class ContinueTaskBody(BaseModel):
    message: UserMessage | None = None

class ToolAnswerBody(BaseModel):
    tool_call_id: str
    answer: str

def agent_stream(async_task_id: int, agent_task: AgentTask) -> Generator[str]:
    """
    Process agent event stream and convert to SSE format
    """
    try:
        for event in agent_task.run():
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
                                "max_tokens": agent_task._ctx.model.context_size,
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
                    _logger.exception("Task failed: {}", error)
                    _logger.debug("Task openai messages: {}",
                                [m.to_litellm_message() for m in agent_task._messages])
                    yield format_sse(event=event.event_id, data={"message": str(error)})
                    break

        task_pool.remove(async_task_id)
    except GeneratorExit:
        # When client disconnects
        task_pool.stop(async_task_id)
        return

@tasks_bp.route("/<int:task_id>/continue", methods=["POST"])
@validate()
def continue_task(task_id: int, body: ContinueTaskBody) -> FlaskResponse:
    """
    This endpoint is used to directly continue the existing task,
    or continue with a new UserMessage
    """
    task = task_pool.add(task_id)

    if body.message is not None:
        task.append_message(body.message)

    return Response(stream_with_context(agent_stream(task_id, task)),
                    mimetype="text/event-stream")

@tasks_bp.route("/<int:task_id>/tool_answer", methods=["POST"])
@validate()
def tool_answer(task_id: int, body: ToolAnswerBody) -> FlaskResponse:
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = task_pool.add(task_id)
    task.set_tool_call_result(body.tool_call_id, body.answer)
    return Response(stream_with_context(agent_stream(task_id, task)),
                    mimetype="text/event-stream")

@tasks_bp.route("/<int:task_id>/tool_reviews", methods=["POST"])
@validate()
def tool_reviews(task_id: int) -> FlaskResponse:
    """
    This endpoint is used to submit the tool call permissions.
    """
    # TODO: Implement tool_reviews logic
    ...

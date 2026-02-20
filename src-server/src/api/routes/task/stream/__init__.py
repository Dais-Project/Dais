from typing import Literal, cast
from fastapi import APIRouter, Request
from sse_starlette import EventSourceResponse
from dais_sdk import UserMessage as SdkUserMessage
from pydantic import BaseModel
from ..message import UserMessage as ApiUserMessage
from .....agent.task import AgentTask
from .....agent.types import MessageReplaceEvent
from .....db import get_db_session
from .....services.task import TaskService
from .utils import AgentGenerator, agent_event_format, agent_stream

class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class ContinueTaskBody(TaskStreamBody):
    message: ApiUserMessage | None = None

class ToolAnswerBody(TaskStreamBody):
    tool_call_id: str
    answer: str

class ToolReviewBody(TaskStreamBody):
    tool_call_id: str
    status: Literal["approved", "denied"]
    auto_approve: bool = False

async def retrieve_task(task_id: int, agent_id: int) -> AgentTask:
    async with get_db_session() as session:
        task = await TaskService(session).get_task_by_id(task_id)
        task.agent_id = agent_id
    return AgentTask(task)

def create_stream_response(stream: AgentGenerator) -> EventSourceResponse:
    gen = (item async for item in stream if item is not None)
    return EventSourceResponse(gen, headers={"Cache-Control": "no-cache"})

# --- --- --- --- --- ---

task_stream_router = APIRouter(tags=["task", "stream"])

@task_stream_router.post("/{task_id}/continue")
async def continue_task(task_id: int, body: ContinueTaskBody, request: Request) -> EventSourceResponse:
    """
    This endpoint is used to directly continue the existing task,
    or continue with a new UserMessage
    """
    task = await retrieve_task(task_id, body.agent_id)

    async def temp_stream() -> AgentGenerator:
        if body.message is not None:
            task.append_message(cast(SdkUserMessage, body.message.to_sdk_message()))
        async for event in agent_stream(task, request):
            yield event

    return create_stream_response(temp_stream())

@task_stream_router.post("/{task_id}/tool_answer")
async def tool_answer(task_id: int, body: ToolAnswerBody, request: Request) -> EventSourceResponse:
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = await retrieve_task(task_id, body.agent_id)
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
    task = await retrieve_task(task_id, body.agent_id)

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

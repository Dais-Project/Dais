import asyncio
from typing import Literal
from fastapi import APIRouter, Request, status
from fastapi.sse import EventSourceResponse
from dais_sdk.types import UserMessage
from pydantic import BaseModel
from .stream_connector import agent_stream
from ....exceptions import ApiError, ApiErrorCode
from .....agent.context import AgentContext
from .....agent.task import AgentTask, ToolCallNotFoundError
from .....agent.types import AgentEvent, TaskDoneEvent
from .....db import db_context
from .....services.task import TaskService
from .....schemas import task as task_schemas

class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class ContinueTaskBody(TaskStreamBody):
    message: UserMessage | None = None

class ToolAnswerBody(TaskStreamBody):
    call_id: str
    answer: str

class ToolReviewBody(TaskStreamBody):
    call_id: str
    status: Literal["approved", "denied"]
    auto_approve: bool = False

async def retrieve_task(task_id: int, agent_id: int) -> AgentTask:
    async with db_context() as db_session:
        task = await TaskService(db_session).get_task_by_id(task_id)
        task.agent_id = agent_id
    task_read = task_schemas.TaskRead.model_validate(task)
    ctx = await AgentContext.create(task_read)
    return AgentTask(ctx)

# --- --- --- --- --- ---

task_stream_router = APIRouter(tags=["task", "stream"])

@task_stream_router.post(
    "/{task_id}/continue",
    responses={ 200: {"model": AgentEvent} },
    response_class=EventSourceResponse,
)
async def continue_task(task_id: int, body: ContinueTaskBody, request: Request):
    """
    This endpoint is used to directly continue the existing task,
    or continue with a new UserMessage
    """
    task = await retrieve_task(task_id, body.agent_id)

    if body.message is not None:
        for event in task.discard_pending_tool_calls():
            yield event
        task.append_message(body.message)
    async for event in agent_stream(task, request):
        yield event

@task_stream_router.post(
    "/{task_id}/tool_answer",
    responses={ 200: {"model": AgentEvent} },
    response_class=EventSourceResponse,
)
async def tool_answer(task_id: int, body: ToolAnswerBody, request: Request):
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = await retrieve_task(task_id, body.agent_id)
    try:
        replace_event = task.set_tool_call_result(body.call_id, body.answer)
    except ToolCallNotFoundError as e:
        raise ApiError(status.HTTP_404_NOT_FOUND,
                       ApiErrorCode.TOOL_CALL_NOT_FOUND,
                       e.call_id)

    yield replace_event
    if task.has_pending_tool_calls():
        await asyncio.shield(task.persist())
        yield TaskDoneEvent()
        return
    async for event in agent_stream(task, request):
        yield event

@task_stream_router.post(
    "/{task_id}/tool_reviews",
    responses={ 200: {"model": AgentEvent} },
    response_class=EventSourceResponse,
)
async def tool_reviews(task_id: int, body: ToolReviewBody, request: Request):
    """
    This endpoint is used to submit the tool call permissions.
    """
    task = await retrieve_task(task_id, body.agent_id)
    try:
        async for event in task.approve_tool_call(body.call_id, body.status == "approved"):
            yield event
    except ToolCallNotFoundError as e:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.TOOL_CALL_NOT_FOUND, e.call_id)

    if task.has_pending_tool_calls():
        await asyncio.shield(task.persist())
        yield TaskDoneEvent()
        return
    async for event in agent_stream(task, request):
        yield event

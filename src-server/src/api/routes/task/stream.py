import asyncio
from typing import Literal
from fastapi import APIRouter, Request
from fastapi.sse import EventSourceResponse
from dais_sdk.types import UserMessage
from pydantic import BaseModel
from src.agent.context import AgentContext
from src.agent.task import AgentTask
from src.agent.types import (
    AgentGenerator,
    AgentEvent,
    TaskDoneEvent, TaskInterruptedEvent, ErrorEvent
)
from loguru import logger
from src.db import db_context
from src.services.task import TaskService
from src.schemas import task as task_schemas


_logger = logger.bind(name="TaskStreamRoute")

class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class ContinueTaskBody(TaskStreamBody):
    message: UserMessage | None = None

class ToolReviewBody(TaskStreamBody):
    call_id: str
    status: Literal["approved", "denied"]
    auto_approve: bool = False

async def create_agent_task(task_id: int, agent_id: int) -> AgentTask:
    async with db_context() as db_session:
        task = await TaskService(db_session).get_task_by_id(task_id)
        task.agent_id = agent_id
    task_read = task_schemas.TaskRead.model_validate(task)
    ctx = await AgentContext.create(task_read)
    return AgentTask(ctx)

async def stream_connector(task: AgentTask, request: Request) -> AgentGenerator:
    pending_terminal_event = None
    try:
        async for event in task.run():
            if await request.is_disconnected():
                await task.stop()
                break

            if isinstance(event, (TaskDoneEvent, TaskInterruptedEvent)):
                pending_terminal_event = event
                continue
            yield event
    except asyncio.CancelledError, GeneratorExit:
        await task.stop()
        raise
    except Exception as e:
        _logger.exception("Error in agent stream")
        yield ErrorEvent(error=str(e))
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
    task = await create_agent_task(task_id, body.agent_id)

    # execute approved tool calls
    if task.has_pending_tool_calls():
        async for event in task.execute_approved_tool_calls():
            yield event
        await asyncio.shield(task.persist())

    if body.message is not None:
        for event in task.discard_pending_tool_calls():
            yield event
        task.append_message(body.message)
        await asyncio.shield(task.persist())
    elif task.has_pending_tool_calls():
        yield TaskDoneEvent()
        return
    async for event in stream_connector(task, request):
        yield event

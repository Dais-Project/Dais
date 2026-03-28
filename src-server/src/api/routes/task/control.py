import asyncio
import time
from typing import Literal
from loguru import logger
from fastapi import APIRouter, status
from pydantic import BaseModel
from src.agent.context import AgentContext
from src.agent.task import AgentTask, MessageNotFoundError
from src.agent.types import MessageReplaceEvent
from src.db import DbSessionDep, db_context
from src.services.task import TaskService
from src.schemas import task as task_schemas
from ...exceptions import ApiError, ApiErrorCode


class TaskControlBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class TaskMessageEdit(BaseModel):
    message_id: str
    content: str

class ToolAnswerBody(TaskControlBody):
    call_id: str
    answer: str

class ToolReviewBody(TaskControlBody):
    call_id: str
    status: Literal["approved", "denied"]
    auto_approve: bool = False

async def create_agent_task(task_id: int, agent_id: int) -> AgentTask:
    async with db_context() as db_session:
        task = await TaskService(db_session).get_task_by_id(task_id)
    task_read = task_schemas.TaskRead.model_validate(task)
    ctx = await AgentContext.create(task_read)
    return AgentTask(ctx)

task_control_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskControlRoute")

@task_control_router.patch("/{task_id}/messages", response_model=task_schemas.TaskRead)
async def edit_task_message(task_id: int, body: TaskMessageEdit, db_session: DbSessionDep):    
    task = await TaskService(db_session).get_task_by_id(task_id)
    target_index = None

    for index, message in enumerate(task.messages):
        if getattr(message, "id", None) == body.message_id:
            target_index = index
            break

    if target_index is None:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.TASK_MESSAGE_NOT_FOUND, f"Task message '{body.message_id}' not found")

    target_message = task.messages[target_index]
    if target_message.role != "user":
        raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.TASK_MESSAGE_NOT_EDITABLE, f"Task message '{body.message_id}' is not editable")

    target_message.content = body.content
    task.messages = task.messages[: target_index + 1]

    return await TaskService(db_session).update_task(task_id, task_schemas.TaskUpdate(
        title=None, agent_id=None,
        messages=task.messages,
        usage=None,
        last_run_at=int(time.time())
    ))

@task_control_router.post("/{task_id}/answer", response_model=MessageReplaceEvent)
async def tool_answer(task_id: int, body: ToolAnswerBody):
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    The frontend should send the tool call id and the answer to this endpoint.
    """
    task = await create_agent_task(task_id, body.agent_id)
    try:
        event = task.set_tool_call_result(body.call_id, body.answer)
        return event
    except MessageNotFoundError:
        raise ApiError(status.HTTP_404_NOT_FOUND,
                       ApiErrorCode.TOOL_CALL_NOT_FOUND)
    finally:
        await asyncio.shield(task.persist())

@task_control_router.post("/{task_id}/review", response_model=MessageReplaceEvent | None)
async def tool_reviews(task_id: int, body: ToolReviewBody):
    """
    This endpoint is used to submit the tool call permissions.
    """
    task = await create_agent_task(task_id, body.agent_id)
    try:
        return await task.approve_tool_call(body.call_id, body.status == "approved")
    except MessageNotFoundError:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.TOOL_CALL_NOT_FOUND)
    finally:
        await asyncio.shield(task.persist())

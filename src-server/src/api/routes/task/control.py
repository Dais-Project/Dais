import asyncio
from typing import Literal
from dais_sdk.types import UserMessage
from loguru import logger
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pydantic import BaseModel
from src.agent.context import AgentContext
from src.agent.task import AgentTask, MessageNotFoundError
from src.agent.types import MessageReplaceEvent, TaskResourceMetadata
from src.db import db_context
from src.services.task import TaskService
from src.schemas import task as task_schemas
from ...exceptions import ApiError, ApiErrorCode


class TaskControlBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

class TaskAppendMessageBody(TaskControlBody):
    message: UserMessage

class TaskMessageEditBody(TaskControlBody):
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
        task.agent_id = agent_id
    task_read = task_schemas.TaskRead.model_validate(task)
    ctx = await AgentContext.create(task_read)
    return AgentTask(ctx)

def parse_append_message_body(body: str = Form(...)) -> TaskAppendMessageBody:
    return TaskAppendMessageBody.model_validate_json(body)

task_control_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskControlRoute")

@task_control_router.post("/{task_id}/messages", response_model=task_schemas.TaskRead)
async def append_task_message(
    task_id: int,
    body: TaskAppendMessageBody = Depends(parse_append_message_body),
    uploaded_files: list[UploadFile] = File(default=[]),
):
    task = await create_agent_task(task_id, body.agent_id)
    task.discard_pending_tool_calls()

    user_message = body.message
    if len(uploaded_files) > 0:
        user_message.attachments = []

        async with db_context() as db_session:
            for file in uploaded_files:
                if file.filename is None or file.content_type is None:
                    raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.TASK_RESOURCE_SHOULD_HAVE_FILENAME_AND_CONTENTTYPE)
                file_bytes = await file.read()
                resource = await TaskService(db_session).save_task_resource(task_id, file.filename, file_bytes)
                user_message.attachments.append(TaskResourceMetadata(
                    resource_id=resource.id,
                    filename=file.filename,
                    type=file.content_type,
                ))

    task.append_message(user_message)
    return await asyncio.shield(task.persist())

@task_control_router.patch("/{task_id}/messages", response_model=task_schemas.TaskRead)
async def edit_task_message(task_id: int, body: TaskMessageEditBody):    
    task = await create_agent_task(task_id, body.agent_id)
    try:
        task.edit_message(body.message_id, body.content)
    except MessageNotFoundError:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.TASK_MESSAGE_NOT_FOUND, f"Task message '{body.message_id}' not found")
    return await asyncio.shield(task.persist())

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

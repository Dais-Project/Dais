import asyncio
from typing import Literal, cast

from dais_sdk.types import ContentBlockMetadata, UserMessage
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from loguru import logger
from pydantic import BaseModel

from src.agent.task.runtime_manager import AgentTaskRuntimeRef, use_agent_task_runtime_manager
from src.agent.types import MessageReplaceEvent, FileResourceMetadata
from src.db import db_context
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks import TaskResourceService

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

def parse_append_message_body(body: str = Form(default=...)) -> TaskAppendMessageBody:
    return TaskAppendMessageBody.model_validate_json(body)

task_control_router = APIRouter(tags=["task"])
_logger = logger.bind(name="TaskControlRoute")

@task_control_router.post("/{task_type}/{task_id}/messages", response_model=task_runtime_schemas.TaskRuntimeContext)
async def append_task_message(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: TaskAppendMessageBody = Depends(parse_append_message_body),
    uploaded_files: list[UploadFile] = File(default=[]),
):
    async def persist_attachments() -> list[FileResourceMetadata]:
        nonlocal uploaded_files
        metadatas = []
        async with db_context() as db_session:
            for file in uploaded_files:
                if file.filename is None or file.content_type is None:
                    raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.TASK_RESOURCE_SHOULD_HAVE_FILENAME_AND_CONTENTTYPE)
                file_bytes = await file.read()
                resource = await TaskResourceService.from_db_session(db_session, task_type).save_task_resource(task_id, file.filename, file_bytes)
                mimetype = file.content_type.split(";")[0].strip().lower()
                metadatas.append(FileResourceMetadata(
                    resource_id=resource.id,
                    filename=file.filename,
                    mimetype=mimetype,
                ))
        return metadatas

    task_ref = AgentTaskRuntimeRef(task_type, task_id, agent_id=body.agent_id)
    async with use_agent_task_runtime_manager().reserve(task_ref) as task:
        task.tool_calls.discard_pendings()

        user_message = body.message
        if len(uploaded_files) > 0:
            resource_metadatas = await asyncio.shield(persist_attachments())
            user_message.attachments = cast(list[ContentBlockMetadata], resource_metadatas)

        task.messages.append(user_message)
        return await asyncio.shield(task.persist())

@task_control_router.patch("/{task_type}/{task_id}/messages", response_model=task_runtime_schemas.TaskRuntimeContext)
async def edit_task_message(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: TaskMessageEditBody,
):
    task_ref = AgentTaskRuntimeRef(task_type, task_id, agent_id=body.agent_id)
    async with use_agent_task_runtime_manager().reserve(task_ref) as task:
        task.messages.edit(body.message_id, body.content)
        return await asyncio.shield(task.persist())

@task_control_router.post("/{task_type}/{task_id}/answer", response_model=MessageReplaceEvent)
async def tool_answer(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: ToolAnswerBody,
):
    """
    This endpoint is used for the HumanInTheLoop tool calls.
    """
    task_ref = AgentTaskRuntimeRef(task_type, task_id, agent_id=body.agent_id)
    async with use_agent_task_runtime_manager().reserve(task_ref) as task:
        try:
            return task.tool_calls.apply_user_response(body.call_id, body.answer)
        finally:
            await asyncio.shield(task.persist())

@task_control_router.post("/{task_type}/{task_id}/review", response_model=MessageReplaceEvent | None)
async def tool_reviews(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: ToolReviewBody,
):
    """
    This endpoint is used to submit the tool call permissions.
    """
    task_ref = AgentTaskRuntimeRef(task_type, task_id, agent_id=body.agent_id)
    async with use_agent_task_runtime_manager().reserve(task_ref) as task:
        try:
            return task.tool_calls.approve(body.call_id, body.status == "approved")
        finally:
            await asyncio.shield(task.persist())

@task_control_router.post("/{task_type}/{task_id}/approve_pendings", response_model=list[MessageReplaceEvent] | None)
async def approve_pendings(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: TaskControlBody,
):
    task_ref = AgentTaskRuntimeRef(task_type, task_id, agent_id=body.agent_id)
    async with use_agent_task_runtime_manager().reserve(task_ref) as task:
        replace_events = []
        try:
            for message in task.tool_calls.collect_pendings():
                event = task.tool_calls.approve(message.call_id, True)
                if event is not None:
                    replace_events.append(event)
            return replace_events
        finally:
            await asyncio.shield(task.persist())

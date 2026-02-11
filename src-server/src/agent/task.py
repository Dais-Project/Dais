import asyncio
import time
import uuid
from types import MethodType
from collections.abc import AsyncGenerator
from typing import Literal, cast
from loguru import logger
from dais_sdk import (
    ToolLike,
    LLM, AssistantMessage, LlmRequestParams,
    SystemMessage, ToolMessage,
    UsageChunk, UserMessage, ToolDef,
    ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError
)
from .context import AgentContext
from .exception_handlers import (
    handle_tool_does_not_exist_error,
    handle_tool_argument_decode_error,
    handle_tool_execution_error
)
from .tool import ExecutionControlToolset
from .tool.types import is_tool_metadata
from .prompts import USER_IGNORED_TOOL_CALL_RESULT, USER_DENIED_TOOL_CALL_RESULT
from .types import (
    AgentEvent, ToolDeniedEvent, ToolEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    MessageReplaceEvent, ToolCallEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent,
    ToolRequirePermissionEvent, ToolRequireUserResponseEvent,
    ErrorEvent,
    UserApprovalStatus, is_agent_metadata
)
from ..services.task import TaskService
from ..db.models import task as task_models
from ..db.schemas import task as task_schemas

class ToolCallNotFoundError(Exception):
    tool_call_id: str

class AgentTask:
    _logger = logger.bind(name="AgentTask")

    def __init__(self, task: task_models.Task):
        self._lock = asyncio.Lock()
        assert task.agent_id is not None
        ctx = self._ctx = AgentContext(task)
        self.llm = self._llm_factory()
        self.task_id = task.id
        self.model_id = ctx.model.name
        self._is_running = True
        self._current_task: asyncio.Task | None = None
        self._messages = task.messages

    def _llm_factory(self) -> LLM:
        llm = LLM(provider=self._ctx.provider.type,
                  base_url=self._ctx.provider.base_url,
                  api_key=self._ctx.provider.api_key)
        tool_exception_handler_manager = llm.tool_exception_handler_manager
        tool_exception_handler_manager.set_handler(ToolDoesNotExistError, handle_tool_does_not_exist_error)
        tool_exception_handler_manager.set_handler(ToolArgumentDecodeError, handle_tool_argument_decode_error)
        tool_exception_handler_manager.set_handler(ToolExecutionError, handle_tool_execution_error)
        return llm

    def _request_param_factory(self) -> LlmRequestParams:
        return LlmRequestParams(
            model=self.model_id,
            messages=[
                SystemMessage(content=self._ctx.system_instruction),
                *self._messages,
            ],
            toolsets=self._ctx.toolsets,
            tool_choice="required")

    async def _create_llm_call(self,
                               request_params: LlmRequestParams
                               ) -> AsyncGenerator[MessageChunkEvent
                                                 | MessageStartEvent
                                                 | MessageEndEvent
                                                 | ToolCallEndEvent
                                                 | TaskInterruptedEvent
                                                 | ErrorEvent, None]:
        """
        Create LLM API call, put message chunks into chunk_queue and return the first tool call message
        """
        assistant_message_id = str(uuid.uuid4())
        assistant_message: AssistantMessage | None = None
        try:
            self._current_task = asyncio.create_task(self.llm.stream_text(request_params))
            stream, message_queue = await self._current_task
            yield MessageStartEvent(message_id=assistant_message_id)
            async for chunk in stream:
                yield MessageChunkEvent(chunk)
                if isinstance(chunk, UsageChunk):
                    self._ctx.usage.set_usage(chunk)

            # Since we did not set `execute_tools` flag,
            # there will be only one assistant message in the queue
            first_message = await message_queue.get()
            assert type(first_message) == AssistantMessage
            assistant_message = first_message
            assistant_message.id = assistant_message_id
            yield MessageEndEvent(message=assistant_message)
        except asyncio.CancelledError:
            yield TaskInterruptedEvent()
            raise
        except Exception as e:
            self._logger.exception(f"Failed to create llm call.")
            yield ErrorEvent(error=e)
        finally:
            self._current_task = None

    async def _process_tool_call_to_event(self, tool: ToolLike, message: ToolMessage) -> ToolEvent:
        """Process tool call and convert to event"""
        # Since the toolsets only contain ToolDefs, and the tools are all under toolsets,
        # so we can safely assert the type of tool_def to ToolDef here.
        assert isinstance(tool, ToolDef)

        if (isinstance(tool.execute, MethodType) and
            tool.execute.__func__ in [ExecutionControlToolset.ask_user, ExecutionControlToolset.finish_task]):
            return ToolRequireUserResponseEvent(
                tool_name=cast(Literal["ask_user", "finish_task"], message.name))

        # use TypeGuards to assert the type of metadata
        assert is_tool_metadata(tool.metadata)
        assert is_agent_metadata(message.metadata)

        if "user_approval" not in message.metadata:
            message.metadata["user_approval"] = UserApprovalStatus.PENDING

        if tool.metadata["auto_approve"] == False:
            match message.metadata["user_approval"]:
                case UserApprovalStatus.PENDING:
                    return ToolRequirePermissionEvent(tool_call_id=message.tool_call_id)
                case UserApprovalStatus.DENIED:
                    message.result = USER_DENIED_TOOL_CALL_RESULT
                    return ToolDeniedEvent(tool_call_id=message.tool_call_id)
                case UserApprovalStatus.APPROVED:
                    # continue to execute
                    pass

        result, error = await self.llm.execute_tool_call(tool, message.arguments)
        message.result = result
        message.error = error

        return ToolExecutedEvent(
            tool_call_id=message.tool_call_id,
            result=result if error is None else None)

    def append_message(self, message: UserMessage):
        try:
            last_message = self._messages[-1]
        except IndexError:
            last_message = None

        if last_message and\
           last_message.role == "tool" and\
           last_message.result is None and \
           last_message.error is None:
            # If the previous tool call is not finished,
            # we consider it as ignored by user.
            last_message.result = USER_IGNORED_TOOL_CALL_RESULT
            last_message.metadata.clear()

        self._messages.append(message)

    def set_tool_call_result(self, tool_call_id: str, result: str) -> ToolMessage:
        """
        Set the result for a tool call

        Raises:
            ToolCallNotFoundError
        """
        for message in reversed(self._messages):
            if (message.role         == "tool" and
                message.tool_call_id == tool_call_id):
                message.result = result
                return message
        raise ToolCallNotFoundError(tool_call_id)

    async def approve_tool_call(
        self, tool_call_id: str, approved: bool
    ) -> tuple[ToolEvent | None, MessageReplaceEvent | None]:
        """
        Approve or deny a tool call

        Returns:
            A tuple of (ToolEvent, MessageReplaceEvent)
            - ToolEvent: The tool execution event (if any)
            - MessageReplaceEvent: The message replace event for frontend sync

        Raises:
            ToolCallNotFoundError
        """
        target_message = None
        for message in reversed(self._messages):
            if message.role == "tool" and message.tool_call_id == tool_call_id:
                target_message = message
                break
        if target_message is None:
            raise ToolCallNotFoundError(tool_call_id)

        metadata = target_message.metadata
        assert is_agent_metadata(metadata)
        if "user_approval" not in metadata:
            # This should not happen, but we handle it just in case.
            self._logger.warning(f"Tool call {tool_call_id} has no user_approval metadata")
            metadata["user_approval"] = UserApprovalStatus.PENDING

        if metadata["user_approval"] != UserApprovalStatus.PENDING:
            # The tool call has been approved or denied before.
            return None, None
        metadata["user_approval"] = (UserApprovalStatus.APPROVED
                                     if approved
                                     else UserApprovalStatus.DENIED)

        request_params = self._request_param_factory()
        tool = request_params.find_tool(target_message.name)
        if tool is None:
            self._logger.error(f"Tool called '{target_message.name}' is not defined.")
            return None, None

        tool_event = await self._process_tool_call_to_event(tool, target_message)
        replace_event = MessageReplaceEvent(message=target_message)
        return tool_event, replace_event

    async def run(self) -> AsyncGenerator[AgentEvent, None]:
        try:
            while self._is_running:
                last_chunk = None
                request_params = self._request_param_factory()
                try:
                    async for chunk in self._create_llm_call(request_params):
                        yield chunk
                        last_chunk = chunk
                except asyncio.CancelledError:
                    # Task cancelled by user
                    break

                assert last_chunk is not None
                # normally, the final chunk should be one of MessageEndEvent, ErrorEvent, TaskInterruptedEvent
                if not isinstance(last_chunk, (MessageEndEvent)):
                    break

                assistant_message = last_chunk.message
                self._messages.append(assistant_message)
                tool_call_messages = assistant_message.get_incomplete_tool_messages()
                if (assistant_message.tool_calls is None or
                    tool_call_messages is None or len(tool_call_messages) == 0):
                    self._logger.info(f"No tool call found in message: {assistant_message}")
                    break

                tool_call_message = tool_call_messages[0] # Only keep the first tool call
                self._messages.append(tool_call_message)
                assistant_message.tool_calls = assistant_message.tool_calls[:1]
                yield ToolCallEndEvent(message=tool_call_message)

                tool = request_params.find_tool(tool_call_message.name)
                if tool is None:
                    yield ErrorEvent(error=Exception(f"Called not exist tool: {tool_call_message.name}"))
                    break

                event = await self._process_tool_call_to_event(tool, tool_call_message)
                yield event
                yield MessageReplaceEvent(message=tool_call_message)
                if isinstance(event, (ToolRequirePermissionEvent, ToolRequireUserResponseEvent)):
                    break
        finally:
            # ensure TaskDoneEvent is yielded
            yield TaskDoneEvent()

    def persist(self):
        with TaskService() as task_service:
            task_service.update_task(self.task_id, task_schemas.TaskUpdate(
                messages=self._messages,
                usage=self._ctx.usage,
                last_run_at=int(time.time())
            ))

    def stop(self):
        self._is_running = False
        if self._current_task:
            self._current_task.cancel()

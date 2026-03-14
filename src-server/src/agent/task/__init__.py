import asyncio
from typing import Callable, Generator, cast
from collections.abc import AsyncGenerator
from loguru import logger
from dais_sdk.tool import ToolCallExecutor
from dais_sdk.types import (
    ToolMessage, UserMessage, AssistantMessage,
    ToolDef, ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError,
)
from ..context import AgentContext
from .tool_call_reviewer import ToolCallReviewer, ToolCallBlocked, ToolCallApproved
from .tool_call_dispatcher import ToolCallDispatcher
from .llm_request_manager import LlmRequestManager
from ..exception_handlers import (
    handle_tool_does_not_exist_error,
    handle_tool_argument_decode_error,
    handle_tool_execution_error
)
from ..prompts import USER_IGNORED_TOOL_CALL_RESULT
from ..types import (
    AgentGenerator, is_agent_tool_metadata,
    ToolEvent, ToolCallEndEvent, MessageEndEvent, MessageReplaceEvent, TaskDoneEvent,
)
from ...db.models import task as task_models


class ToolCallNotFoundError(Exception):
    call_id: str

class AgentTask:
    _logger = logger.bind(name="AgentTask")

    def __init__(self, ctx: AgentContext):
        self._lock = asyncio.Lock()
        self._ctx = ctx
        self._is_running = True
        self._llm_request_manager = LlmRequestManager(ctx)
        self._tool_call_executor = ToolCallExecutor()
        self._tool_call_executor.exception_handler.set_handler(ToolDoesNotExistError, handle_tool_does_not_exist_error)
        self._tool_call_executor.exception_handler.set_handler(ToolArgumentDecodeError, handle_tool_argument_decode_error)
        self._tool_call_executor.exception_handler.set_handler(ToolExecutionError, handle_tool_execution_error)

        self._tool_call_reviewer = ToolCallReviewer()
        self._tool_call_dispatcher = ToolCallDispatcher(self._ctx, self._tool_call_executor, self._tool_call_reviewer)

    def _find_message(self, predicate: Callable[[task_models.TaskMessage], bool]) -> task_models.TaskMessage:
        for message in reversed(self._ctx.messages):
            if predicate(message):
                return message
        raise ToolCallNotFoundError()

    def _extract_tool_call(self, message: AssistantMessage) -> list[ToolMessage] | None:
        tool_call_messages = message.get_incomplete_tool_messages()
        if (message.tool_calls is None or
            tool_call_messages is None or len(tool_call_messages) == 0):
            return None
        return tool_call_messages

    def has_pending_tool_calls(self) -> bool:
        for message in reversed(self._ctx.messages):
            if message.role == "assistant":
                break
            if message.role == "tool" and not message.is_complete:
                return True
        return False

    def discard_pending_tool_calls(self) -> Generator[MessageReplaceEvent]:
        for message in reversed(self._ctx.messages):
            if message.role == "assistant":
                # discard pending tool calls from the last assistant message
                break
            if message.role == "tool" and not message.is_complete:
                message.result = USER_IGNORED_TOOL_CALL_RESULT
                message.metadata.clear()
                yield MessageReplaceEvent(message=message)

    def append_message(self, message: UserMessage):
        self._ctx.messages.append(message)

    def set_tool_call_result(self, call_id: str, result: str) -> MessageReplaceEvent:
        """
        Set the result for a tool call

        Raises:
            ToolCallNotFoundError
        """
        target_message = self._find_message(lambda m: m.role == "tool" and m.call_id == call_id)
        cast(ToolMessage, target_message).result = result
        return MessageReplaceEvent(message=target_message)

    async def approve_tool_call(self, call_id: str, approved: bool) -> AsyncGenerator[ToolEvent | MessageReplaceEvent, None]:
        """
        Approve or deny a tool call

        Raises:
            ToolCallNotFoundError
        """
        target_message = self._find_message(lambda m: m.role == "tool" and m.call_id == call_id)
        assert isinstance(target_message, ToolMessage)

        metadata = target_message.metadata
        assert is_agent_tool_metadata(metadata)
        if not self._tool_call_reviewer.apply_user_approval(call_id, metadata, approved):
            return
        yield MessageReplaceEvent(message=target_message.model_copy())

        tool = self._ctx.find_tool(target_message.name)
        if tool is None:
            self._logger.error(f"Tool called '{target_message.name}' is not defined.")
            return

        # Since the toolsets only contain ToolDefs, and the tools are all under toolsets,
        # so we can safely assert the type of tool_def to ToolDef here.
        assert isinstance(tool, ToolDef)

        permission_check_result = self._tool_call_reviewer.check_permission(tool, target_message)
        match permission_check_result:
            case ToolCallBlocked(event):
                yield event
            case ToolCallApproved():
                yield await self._tool_call_dispatcher.execute(tool, message=target_message)
        yield MessageReplaceEvent(message=target_message)

    async def run(self) -> AgentGenerator:
        _exited_by_generator_close = False

        try:
            while self._is_running:
                last_chunk = None
                try:
                    llm_stream = self._llm_request_manager.create_llm_call()
                    async for chunk in llm_stream:
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
                if (assistant_message.content == None and
                    assistant_message.reasoning_content == None and
                    (assistant_message.tool_calls is None or len(assistant_message.tool_calls) == 0)):
                    # empty message, retry
                    continue

                self._ctx.messages.append(assistant_message)
                tool_call_messages = self._extract_tool_call(assistant_message)
                if tool_call_messages is None:
                    break

                for message in tool_call_messages:
                    self._ctx.messages.append(message)
                    yield ToolCallEndEvent(message=message)

                dispatch_stream, dispatch_result =\
                    self._tool_call_dispatcher.dispatch(tool_call_messages)
                async for event in dispatch_stream:
                    yield event
                if dispatch_result.has_finished_task or len(dispatch_result.pendings) > 0:
                    break
        except GeneratorExit:
            _exited_by_generator_close = True
        finally:
            if not _exited_by_generator_close:
                yield TaskDoneEvent()

    async def persist(self):
        await self._ctx.persist()

    async def stop(self):
        self._is_running = False
        await self._llm_request_manager.cancel()

import asyncio
from typing import Callable
from collections.abc import AsyncGenerator
from loguru import logger
from dais_sdk.tool import ToolCallExecutor
from dais_sdk.types import (
    Message, ToolMessage, UserMessage, AssistantMessage,
    ToolDef,
    ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError,
    ProviderRateLimitError, ProviderServerError, ProviderTimeoutError, ProviderNetworkError,
)
from .tool_call_reviewer import ToolCallReviewer
from .tool_call_dispatcher import ToolCallDispatcher
from .llm_request_manager import LlmRequestManager
from ..context import AgentContext, task_models
from ..exception_handlers import (
    handle_tool_does_not_exist_error,
    handle_tool_argument_decode_error,
    handle_tool_execution_error
)
from ..prompts import USER_IGNORED_TOOL_CALL_RESULT
from ..types import (
    AgentGenerator, UserApprovalStatus, is_agent_tool_metadata,
    ToolCallEndEvent, MessageEndEvent, MessageReplaceEvent, TaskInterruptedEvent, TaskDoneEvent, ToolExecutedEvent, ErrorEvent
)


class MessageNotFoundError(Exception): ...

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

        self._tool_call_reviewer = ToolCallReviewer(ctx)
        self._tool_call_dispatcher = ToolCallDispatcher(self._ctx, self._tool_call_executor, self._tool_call_reviewer)

    def _find_message(self, predicate: Callable[[Message], bool]) -> Message:
        for message in reversed(self._ctx.messages):
            if predicate(message):
                return message
        raise MessageNotFoundError()

    def _extract_tool_call(self, message: AssistantMessage) -> list[ToolMessage] | None:
        tool_call_messages = message.get_incomplete_tool_messages()
        if (message.tool_calls is None or
            tool_call_messages is None or len(tool_call_messages) == 0):
            return None
        return tool_call_messages

    def has_pending_tool_calls(self) -> bool:
        for message in reversed(self._ctx.messages):
            if message.role == "assistant": break
            if message.role == "tool":
                if message.is_complete: continue
                assert is_agent_tool_metadata(message.metadata)
                if message.metadata.get("user_approval") == UserApprovalStatus.PENDING:
                    return True
        return False

    def discard_pending_tool_calls(self):
        for message in reversed(self._ctx.messages):
            if message.role == "assistant":
                # discard pending tool calls from the last assistant message
                break
            if message.role == "tool" and not message.is_complete:
                message.result = USER_IGNORED_TOOL_CALL_RESULT
                message.metadata.clear()

    def append_message(self, message: UserMessage):
        self._ctx.messages.append(message)

    def edit_message(self, message_id: str, new_content: str):
        target_message = self._find_message(lambda message: message.role == "user" and message.id == message_id)
        target_index: int | None = None
        for index, message in enumerate(self._ctx.messages):
            if message is target_message:
                target_index = index
                break

        assert target_index is not None
        assert target_message.role == "user"
        target_message.content = new_content
        self._ctx.messages = self._ctx.messages[: target_index + 1]

    def set_tool_call_result(self, call_id: str, result: str) -> MessageReplaceEvent:
        target_message = self._find_message(lambda m: m.role == "tool" and m.call_id == call_id)
        assert target_message.role == "tool"
        target_message.result = result
        return MessageReplaceEvent(message=target_message)

    async def approve_tool_call(self, call_id: str, approved: bool) -> MessageReplaceEvent | None:
        target_message = self._find_message(lambda m: m.role == "tool" and m.call_id == call_id)
        assert isinstance(target_message, ToolMessage)

        metadata = target_message.metadata
        assert is_agent_tool_metadata(metadata)
        if not self._tool_call_reviewer.apply_user_approval(call_id, metadata, approved):
            return None
        return MessageReplaceEvent(message=target_message.model_copy())

    async def execute_approved_tool_calls(self) -> AsyncGenerator[ToolExecutedEvent | MessageReplaceEvent, None]:
        tool_messages_to_execute: list[ToolMessage] = []
        for message in reversed(self._ctx.messages):
            if message.role == "assistant": break
            if message.role != "tool": continue
            assert is_agent_tool_metadata(message.metadata)
            is_approved = message.metadata.get("user_approval") == "approved"
            is_complete = message.is_complete
            if is_approved and not is_complete:
                tool_messages_to_execute.append(message)

        if len(tool_messages_to_execute) == 0: return

        for message in tool_messages_to_execute:
            tool: ToolDef | None = self._ctx.find_tool(message.name)
            if tool is None:
                self._logger.error(f"Tool called '{message.name}' is not defined.")
                message.error = handle_tool_does_not_exist_error(ToolDoesNotExistError(message.name))
                continue
            yield await self._tool_call_dispatcher.execute(tool, message)
            yield MessageReplaceEvent(message=message)

    async def run(self) -> AgentGenerator:
        _exited_by_generator_close = False
        retries = 0
        max_retries = 3

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

                match last_chunk:
                    case MessageEndEvent():
                        retries = 0
                    case ErrorEvent(error=error, retryable=retryable):
                        self._logger.warning(f"LLM provider error: {error}")
                        if retryable:
                            retries += 1
                            if retries >= max_retries: break
                            continue # retry
                    case TaskInterruptedEvent(): break
                    case _ as chunk:
                        self._logger.warning(f"Unexpected message event: {chunk}")
                        break

                assert isinstance(last_chunk, MessageEndEvent)
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
                if (dispatch_result.has_finished_task or
                    dispatch_result.has_blocked_tool_calls):
                    self._is_running = False
                    break
        except GeneratorExit:
            _exited_by_generator_close = True
        finally:
            if not _exited_by_generator_close:
                yield TaskDoneEvent()

    async def persist(self) -> task_models.Task:
        return await self._ctx.persist()

    async def stop(self):
        self._is_running = False
        await self._llm_request_manager.cancel()

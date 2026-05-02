import asyncio
from collections.abc import AsyncGenerator
from loguru import logger
from dais_sdk.tool import ToolCallExecutor
from dais_sdk.types import (
    ToolMessage, AssistantMessage,
    ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError,
)
from src.schemas.tasks import runtime as task_runtime_schemas
from .message_manager import MessageManager, MessageNotFoundError
from .tool_call_reviewer import ToolCallReviewer
from .tool_call_dispatcher import ToolCallDispatcher
from .llm_request_manager import LlmRequestManager
from ..context import AgentContext
from ..exception_handlers import (
    handle_tool_does_not_exist_error,
    handle_tool_argument_decode_error,
    handle_tool_execution_error
)
from ..prompts import USER_DENIED_TOOL_CALL_RESULT
from ..types import (
    AgentGenerator, UserApprovalStatus, StopReason, is_agent_tool_metadata,
    ToolEvent, ToolCallEndEvent, MessageEndEvent, MessageReplaceEvent, TaskInterruptedEvent, TaskDoneEvent, ErrorEvent
)


class AgentTask:
    _logger = logger.bind(name="AgentTask")

    def __init__(self, ctx: AgentContext):
        self._ctx = ctx
        self._is_running = True
        self._message_manager = MessageManager(ctx)
        self._llm_request_manager = LlmRequestManager(ctx)
        self._tool_call_executor = ToolCallExecutor()
        self._tool_call_executor.exception_handler.set_handler(ToolDoesNotExistError, handle_tool_does_not_exist_error)
        self._tool_call_executor.exception_handler.set_handler(ToolArgumentDecodeError, handle_tool_argument_decode_error)
        self._tool_call_executor.exception_handler.set_handler(ToolExecutionError, handle_tool_execution_error)

        self._tool_call_reviewer = ToolCallReviewer(ctx)
        self._tool_call_dispatcher = ToolCallDispatcher(self._ctx, self._tool_call_executor, self._tool_call_reviewer)

    def _extract_tool_call(self, message: AssistantMessage) -> list[ToolMessage] | None:
        tool_call_messages = message.get_incomplete_tool_messages()
        if (message.tool_calls is None or
            tool_call_messages is None or len(tool_call_messages) == 0):
            return None
        return tool_call_messages

    @property
    def messages(self) -> MessageManager:
        return self._message_manager

    async def approve_tool_call(self, call_id: str, approved: bool) -> MessageReplaceEvent | None:
        target_message = self._message_manager.find(lambda m: m.role == "tool" and m.call_id == call_id)
        assert isinstance(target_message, ToolMessage)

        metadata = target_message.metadata
        assert is_agent_tool_metadata(metadata)
        if not self._tool_call_reviewer.apply_user_approval(call_id, metadata, approved):
            return None
        if "user_approval" in metadata and metadata["user_approval"] == UserApprovalStatus.DENIED:
            target_message.result = USER_DENIED_TOOL_CALL_RESULT
        return MessageReplaceEvent(message=target_message.model_copy())

    async def execute_approved_tool_calls(self) -> AsyncGenerator[ToolEvent | MessageReplaceEvent | ErrorEvent, None]:
        tool_messages_to_execute: list[ToolMessage] = []
        for message in reversed(self._ctx.messages):
            if message.role == "assistant": break
            if message.role != "tool": continue
            assert is_agent_tool_metadata(message.metadata)
            is_approved = message.metadata.get("user_approval") == UserApprovalStatus.APPROVED
            is_complete = message.is_complete
            if is_approved and not is_complete:
                tool_messages_to_execute.append(message)

        if len(tool_messages_to_execute) == 0: return

        dispatch_stream, _ = self._tool_call_dispatcher.dispatch(tool_messages_to_execute)
        async for event in dispatch_stream:
            yield event

    async def run(self) -> AgentGenerator:
        _exited_by_generator_close = False
        retries = 0
        max_retries = 3

        try:
            while self._is_running:
                last_chunk: MessageEndEvent | TaskInterruptedEvent | ErrorEvent | None = None
                try:
                    llm_stream = self._llm_request_manager.create_llm_call()
                    async for chunk in llm_stream:
                        if isinstance(chunk, self._llm_request_manager.FINISHING_CHUNK_TYPE):
                            last_chunk = chunk
                            continue
                        yield chunk
                except asyncio.CancelledError:
                    # Task cancelled by user
                    break

                match last_chunk:
                    case MessageEndEvent() as message_end_chunk:
                        retries = 0
                        yield message_end_chunk
                    case ErrorEvent(error=error, retryable=retryable) as error_chunk:
                        self._logger.warning(f"LLM provider error: {error}")
                        if not retryable or retries >= max_retries:
                            yield error_chunk
                            break
                        retries += 1
                        continue # retry
                    case TaskInterruptedEvent() as interrupted_chunk:
                        yield interrupted_chunk
                        break
                    case _ as chunk:
                        self._logger.warning(f"Unexpected message event: {chunk}")
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
                if (dispatch_result.has_finished_task or
                    dispatch_result.has_blocked_tool_calls):
                    self._is_running = False
                    break
        except GeneratorExit:
            _exited_by_generator_close = True
        finally:
            if not _exited_by_generator_close:
                yield TaskDoneEvent()

    async def run_until_done(self) -> StopReason:
        async for event in self.run():
            if isinstance(event, ErrorEvent):
                return StopReason.ERROR
            if isinstance(event, TaskInterruptedEvent):
                return StopReason.INTERRUPTED

        if len(self._message_manager.collect_pending_tool_messages()) > 0:
            return StopReason.PENDING_APPROVE

        return StopReason.COMPLETED

    async def persist(self) -> task_runtime_schemas.TaskRuntimeContext:
        return await self._ctx.persist()

    async def stop(self):
        self._is_running = False
        await self._llm_request_manager.cancel()

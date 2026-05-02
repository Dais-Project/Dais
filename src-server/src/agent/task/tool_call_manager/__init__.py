from collections.abc import AsyncGenerator
from dais_sdk.tool import ToolCallExecutor
from dais_sdk.types import (
    ToolMessage,
    ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError,
)
from .tool_call_reviewer import ToolCallReviewer
from .tool_call_dispatcher import ToolCallDispatchResult, ToolCallDispatcher
from .exception_handlers import (
    handle_tool_does_not_exist_error,
    handle_tool_argument_decode_error,
    handle_tool_execution_error,
)
from ..message_manager import MessageManager
from ...context import AgentContext
from ...prompts import USER_IGNORED_TOOL_CALL_RESULT, USER_DENIED_TOOL_CALL_RESULT
from ...tool.types import is_tool_metadata
from ...types import (
    MessageReplaceEvent, UserApprovalStatus, is_agent_tool_metadata
)
from ...types import (
    UserApprovalStatus, is_agent_tool_metadata,
    ToolEvent, MessageReplaceEvent, ErrorEvent
)


class ToolCallManager:
    def __init__(self, ctx: AgentContext, message_manager: MessageManager):
        self._ctx = ctx
        self._message_manager = message_manager

        self._tool_call_executor = ToolCallExecutor()
        self._tool_call_executor.exception_handler.set_handler(ToolDoesNotExistError, handle_tool_does_not_exist_error)
        self._tool_call_executor.exception_handler.set_handler(ToolArgumentDecodeError, handle_tool_argument_decode_error)
        self._tool_call_executor.exception_handler.set_handler(ToolExecutionError, handle_tool_execution_error)

        self._tool_call_reviewer = ToolCallReviewer(ctx)
        self._tool_call_dispatcher = ToolCallDispatcher(self._ctx, self._tool_call_executor, self._tool_call_reviewer)

    def apply_user_response(self, call_id: str, result: str) -> MessageReplaceEvent:
        target_message = self._message_manager.find(lambda m: m.role == "tool" and m.call_id == call_id)
        assert target_message.role == "tool"
        target_tool = self._ctx.find_tool(target_message.name)
        if target_tool is None:
            target_message.error = handle_tool_does_not_exist_error(ToolDoesNotExistError(target_message.name))
            return MessageReplaceEvent(message=target_message)

        assert is_tool_metadata(target_tool.metadata)
        if not target_tool.metadata["needs_user_interaction"]:
            raise ValueError(f"Tool {target_tool.name} is not a tool that needs user interaction.")

        target_message.result = result
        return MessageReplaceEvent(message=target_message)

    async def approve(self, call_id: str, approved: bool) -> MessageReplaceEvent | None:
        target_message = self._message_manager.find(lambda m: m.role == "tool" and m.call_id == call_id)
        assert isinstance(target_message, ToolMessage)

        metadata = target_message.metadata
        assert is_agent_tool_metadata(metadata)
        if not self._tool_call_reviewer.apply_user_approval(call_id, metadata, approved):
            return None
        if "user_approval" in metadata and metadata["user_approval"] == UserApprovalStatus.DENIED:
            target_message.result = USER_DENIED_TOOL_CALL_RESULT
        return MessageReplaceEvent(message=target_message.model_copy())

    def collect_pendings(self) -> list[ToolMessage]:
        messages = []
        for message in self._message_manager.tail_tool_messages_iter():
            if message.is_complete: continue
            assert is_agent_tool_metadata(message.metadata)
            if message.metadata.get("user_approval") == UserApprovalStatus.PENDING:
                messages.append(message)
        return messages

    def discard_pendings(self):
        for message in self._message_manager.tail_tool_messages_iter():
            if not message.is_complete:
                message.result = USER_IGNORED_TOOL_CALL_RESULT
                message.metadata.clear()

    def dispatch(self,
                 tool_calls: list[ToolMessage]
                 ) -> tuple[
                    AsyncGenerator[ToolEvent | MessageReplaceEvent | ErrorEvent, None],
                    ToolCallDispatchResult]:
        return self._tool_call_dispatcher.dispatch(tool_calls)

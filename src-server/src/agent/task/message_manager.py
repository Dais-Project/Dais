from typing import Callable
from dais_sdk.types import Message, ToolDoesNotExistError, ToolMessage, UserMessage
from ..context import AgentContext
from ..prompts import USER_IGNORED_TOOL_CALL_RESULT
from ..tool.types import is_tool_metadata
from ..types import (
    MessageReplaceEvent, UserApprovalStatus, is_agent_tool_metadata
)
from ..exception_handlers import handle_tool_does_not_exist_error


class MessageNotFoundError(Exception): ...

class MessageManager:
    def __init__(self, ctx: AgentContext):
        self._ctx = ctx

    def find(self, predicate: Callable[[Message], bool]) -> Message:
        for message in reversed(self._ctx.messages):
            if predicate(message):
                return message
        raise MessageNotFoundError()

    def append(self, message: UserMessage):
        self._ctx.messages.append(message)

    def edit(self, message_id: str, new_content: str):
        target_message = self.find(lambda message: message.role == "user" and message.id == message_id)
        target_index: int | None = None
        for index, message in enumerate(self._ctx.messages):
            if message is target_message:
                target_index = index
                break

        assert target_index is not None
        assert target_message.role == "user"
        target_message.content = new_content
        self._ctx.messages = self._ctx.messages[: target_index + 1]

    def apply_user_response_to_tool_message(self, call_id: str, result: str) -> MessageReplaceEvent:
        target_message = self.find(lambda m: m.role == "tool" and m.call_id == call_id)
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

    def collect_pending_tool_messages(self) -> list[ToolMessage]:
        messages = []
        for message in reversed(self._ctx.messages):
            if message.role == "assistant": break
            if message.role == "tool":
                if message.is_complete: continue
                assert is_agent_tool_metadata(message.metadata)
                if message.metadata.get("user_approval") == UserApprovalStatus.PENDING:
                    messages.append(message)
        return messages

    def discard_pending_tool_messages(self):
        for message in reversed(self._ctx.messages):
            if message.role == "assistant":
                # discard pending tool calls from the last assistant message
                break
            if message.role == "tool" and not message.is_complete:
                message.result = USER_IGNORED_TOOL_CALL_RESULT
                message.metadata.clear()

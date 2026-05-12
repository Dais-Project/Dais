from typing import Callable, Generator
from dais_sdk.types import Message, ToolMessage, UserMessage
from ..context import AgentContext


class MessageNotFoundError(Exception): ...

class MessageManager:
    def __init__(self, ctx: AgentContext):
        self._ctx = ctx

    def __getitem__(self, index: int) -> Message:
        return self._ctx.messages[index]

    def find(self, predicate: Callable[[Message], bool]) -> Message:
        for message in reversed(self._ctx.messages):
            if predicate(message):
                return message
        raise MessageNotFoundError()

    def tail_tool_messages_iter(self) -> Generator[ToolMessage]:
        """
        Returns the generator for the ToolMessages after the last AssistantMessage
        """
        for message in reversed(self._ctx.messages):
            if message.role == "assistant":
                break
            if message.role == "tool":
                yield message

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

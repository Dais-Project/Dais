from collections.abc import AsyncGenerator
from typing import Annotated, Literal, Self
from dais_sdk.types import (
    Message,
    ToolMessage, AssistantMessage,
    TextChunkEvent as SdkTextChunkEvent,
    ToolCallChunkEvent as SdkToolCallChunkEvent
)
from pydantic import BaseModel, Discriminator
from src.db.models.task import TaskUsage


class MessageStartEvent(BaseModel):
    message_id: str # This ID is for the AssistantMessage that is being streamed
    event_id: Literal["MESSAGE_START"] = "MESSAGE_START"

class TextChunkEvent(BaseModel):
    content: str
    message_id: str
    event_id: Literal["TEXT_CHUNK"] = "TEXT_CHUNK"

    @classmethod
    def from_sdk(cls, chunk: SdkTextChunkEvent, message_id: str) -> Self:
        return cls(content=chunk.content, message_id=message_id)

class ToolCallChunkEvent(BaseModel):
    call_id: str | None
    name: str | None
    arguments: str | None
    index: int
    event_id: Literal["TOOL_CALL_CHUNK"] = "TOOL_CALL_CHUNK"

    @classmethod
    def from_sdk(cls, chunk: SdkToolCallChunkEvent) -> Self:
        return cls(
            call_id=chunk.id,
            name=chunk.name,
            arguments=chunk.arguments,
            index=chunk.index
        )

class UsageChunkEvent(BaseModel):
    input_tokens: int
    output_tokens: int
    max_tokens: int
    total_tokens: int
    accumulated_input_tokens: int
    accumulated_output_tokens: int
    event_id: Literal["USAGE_CHUNK"] = "USAGE_CHUNK"

    @classmethod
    def from_task_usage(cls, usage: TaskUsage) -> Self:
        return cls(
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            max_tokens=usage.max_tokens,
            total_tokens=usage.total_tokens,
            accumulated_input_tokens=usage.accumulated_input_tokens,
            accumulated_output_tokens=usage.accumulated_output_tokens,
        )

class MessageEndEvent(BaseModel):
    """
    This event contains the final assistant message,
    will be sent immediately after receiving the last stream chunk from API.
    """
    message: AssistantMessage
    event_id: Literal["MESSAGE_END"] = "MESSAGE_END"

    @classmethod
    def from_sdk(cls, message: AssistantMessage) -> Self:
        return cls(message=message)

class MessageReplaceEvent(BaseModel):
    message: Message
    event_id: Literal["MESSAGE_REPLACE"] = "MESSAGE_REPLACE"

class ToolCallEndEvent(BaseModel):
    message: ToolMessage
    event_id: Literal["TOOL_CALL_END"] = "TOOL_CALL_END"

class TaskDoneEvent(BaseModel):
    event_id: Literal["TASK_DONE"] = "TASK_DONE"

class TaskInterruptedEvent(BaseModel):
    event_id: Literal["TASK_INTERRUPTED"] = "TASK_INTERRUPTED"

class ErrorEvent(BaseModel):
    error: str
    retryable: bool = False
    event_id: Literal["ERROR"] = "ERROR"

class ToolExecutedEvent(BaseModel):
    call_id: str
    result: str | None
    event_id: Literal["TOOL_EXECUTED"] = "TOOL_EXECUTED"

class ToolDeniedEvent(BaseModel):
    call_id: str
    event_id: Literal["TOOL_DENIED"] = "TOOL_DENIED"

class ToolRequireUserResponseEvent(BaseModel):
    tool_name: str
    event_id: Literal["TOOL_REQUIRE_USER_RESPONSE"] = "TOOL_REQUIRE_USER_RESPONSE"

class ToolRequirePermissionEvent(BaseModel):
    call_id: str
    tool_name: str
    event_id: Literal["TOOL_REQUIRE_PERMISSION"] = "TOOL_REQUIRE_PERMISSION"


type ToolEvent = (
    ToolExecutedEvent |
    ToolDeniedEvent |
    ToolRequireUserResponseEvent |
    ToolRequirePermissionEvent
)

type AgentEvent = Annotated[(
    MessageStartEvent |
    TextChunkEvent |
    ToolCallChunkEvent |
    UsageChunkEvent |
    MessageEndEvent |
    MessageReplaceEvent |
    ToolCallEndEvent |
    TaskDoneEvent |
    TaskInterruptedEvent |
    ToolEvent |
    ErrorEvent
), Discriminator("event_id")]

type AgentGenerator = AsyncGenerator[AgentEvent, None]

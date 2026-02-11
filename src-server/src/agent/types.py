from dataclasses import dataclass
from enum import Enum
from typing import Literal, TypeGuard, TypedDict
from dais_sdk import MessageChunk, ToolMessage, AssistantMessage, UsageChunk
from ..db.models.task import TaskMessage, TaskUsage

@dataclass(frozen=True)
class MessageStartEvent:
    """Message start event"""
    message_id: str # This ID is for the AssistantMessage that is being streamed
    event_id: Literal["MESSAGE_START"] = "MESSAGE_START"

@dataclass(frozen=True)
class MessageChunkEvent:
    """Message chunk event"""
    chunk: MessageChunk
    event_id: Literal["MESSAGE_CHUNK"] = "MESSAGE_CHUNK"

@dataclass(frozen=True)
class MessageEndEvent:
    """Message end event"""
    message: AssistantMessage # This message contains the final assistant message
    event_id: Literal["MESSAGE_END"] = "MESSAGE_END"

@dataclass(frozen=True)
class MessageReplaceEvent:
    """Message replace event - carries complete message object for frontend replacement"""
    message: TaskMessage
    event_id: Literal["MESSAGE_REPLACE"] = "MESSAGE_REPLACE"

@dataclass(frozen=True)
class ToolCallEndEvent:
    """Tool call end event - notifies frontend that tool call has ended"""
    message: ToolMessage
    event_id: Literal["TOOL_CALL_END"] = "TOOL_CALL_END"

@dataclass(frozen=True)
class TaskDoneEvent:
    """Task done event"""
    event_id: Literal["TASK_DONE"] = "TASK_DONE"

@dataclass(frozen=True)
class TaskInterruptedEvent:
    """Task interrupted event"""
    event_id: Literal["TASK_INTERRUPTED"] = "TASK_INTERRUPTED"

@dataclass(frozen=True)
class ToolExecutedEvent:
    """Tool execution result event"""
    tool_call_id: str
    result: str | None
    event_id: Literal["TOOL_EXECUTED"] = "TOOL_EXECUTED"

@dataclass(frozen=True)
class ToolDeniedEvent:
    """Tool execution result event"""
    tool_call_id: str
    event_id: Literal["TOOL_DENIED"] = "TOOL_DENIED"

@dataclass(frozen=True)
class ToolRequireUserResponseEvent:
    """Event for tools that require user response"""
    tool_name: Literal["ask_user", "finish_task"]
    event_id: Literal["TOOL_REQUIRE_USER_RESPONSE"] = "TOOL_REQUIRE_USER_RESPONSE"

@dataclass(frozen=True)
class ToolRequirePermissionEvent:
    """Event for tools that require user permission"""
    tool_call_id: str
    event_id: Literal["TOOL_REQUIRE_PERMISSION"] = "TOOL_REQUIRE_PERMISSION"

@dataclass(frozen=True)
class ErrorEvent:
    """Error event"""
    error: Exception
    event_id: Literal["ERROR"] = "ERROR"

ToolEvent = (
    ToolExecutedEvent |
    ToolDeniedEvent |
    ToolRequireUserResponseEvent |
    ToolRequirePermissionEvent
)

AgentEvent = (
    MessageChunkEvent |
    MessageStartEvent |
    MessageEndEvent |
    MessageReplaceEvent |
    ToolCallEndEvent |
    TaskDoneEvent |
    TaskInterruptedEvent |
    ToolEvent |
    ErrorEvent
)

# --- --- --- --- --- ---

@dataclass(frozen=False)
class ContextUsage(TaskUsage):
    @property
    def remaining_tokens(self) -> int:
        reserved_output = 4096
        safety_margin = int(self.max_tokens * 0.1)
        return self.max_tokens - self.total_tokens - reserved_output - safety_margin

    def set_usage(self, usage: UsageChunk) -> None:
        self.input_tokens = usage.input_tokens
        self.output_tokens = usage.output_tokens
        self.total_tokens = usage.total_tokens

class UserApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class ToolMessageMetadata(TypedDict, total=False):
    user_approval: UserApprovalStatus

@staticmethod
def is_agent_metadata(_: dict) -> TypeGuard[ToolMessageMetadata]:
    return True

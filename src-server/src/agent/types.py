from dataclasses import dataclass
from typing import Literal
from liteai_sdk import MessageChunk

@dataclass(frozen=True)
class MessageChunkEvent:
    """Message chunk event"""
    chunk: MessageChunk
    event_id: Literal["MESSAGE_CHUNK"] = "MESSAGE_CHUNK"

@dataclass(frozen=True)
class MessageStartEvent:
    """Message start event"""
    event_id: Literal["MESSAGE_START"] = "MESSAGE_START"

@dataclass(frozen=True)
class MessageEndEvent:
    """Message end event"""
    event_id: Literal["MESSAGE_END"] = "MESSAGE_END"

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

AgentEvent = (
    MessageChunkEvent |
    MessageStartEvent |
    MessageEndEvent |
    TaskDoneEvent |
    TaskInterruptedEvent |
    ToolExecutedEvent |
    ToolRequireUserResponseEvent |
    ToolRequirePermissionEvent |
    ErrorEvent
)

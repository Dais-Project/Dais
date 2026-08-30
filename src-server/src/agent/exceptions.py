from enum import StrEnum

from fastapi import status

from src.schemas.tasks import runtime as task_runtime_schemas


class AgentError(Exception):
    """Base class for Agent layer errors."""

    def __init__(self, status_code: int, error_code: AgentErrorCode, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code

class AgentErrorCode(StrEnum):
    MESSAGE_NOT_FOUND = "MESSAGE_NOT_FOUND"
    TOOL_CALL_NOT_FOUND = "TOOL_CALL_NOT_FOUND"
    TASK_RUNTIME_CONFLICT = "TASK_RUNTIME_CONFLICT"


class MessageNotFoundError(AgentError):
    def __init__(self, message_id: str | None = None):
        self.message_id = message_id
        message = (
            f"Task message '{message_id}' not found"
            if message_id is not None
            else "Task message not found"
        )
        super().__init__(
            status.HTTP_404_NOT_FOUND,
            AgentErrorCode.MESSAGE_NOT_FOUND,
            message,
        )


class ToolCallNotFoundError(AgentError):
    def __init__(self, call_id: str):
        self.call_id = call_id
        super().__init__(
            status.HTTP_404_NOT_FOUND,
            AgentErrorCode.TOOL_CALL_NOT_FOUND,
            f"Tool call '{call_id}' not found",
        )


class AgentTaskRuntimeConflictError(AgentError):
    def __init__(
        self,
        task_type: task_runtime_schemas.TaskType,
        task_id: int,
    ):
        self.task_type = task_type
        self.task_id = task_id
        super().__init__(
            status.HTTP_409_CONFLICT,
            AgentErrorCode.TASK_RUNTIME_CONFLICT,
            f"Task runtime {task_type}:{task_id} is already reserved",
        )

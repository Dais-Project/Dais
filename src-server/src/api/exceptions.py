from enum import StrEnum
from dais_sdk.types import McpConnectionErrorCode


class ApiErrorCode(StrEnum):
    TOOL_CALL_NOT_FOUND = "TOOL_CALL_NOT_FOUND"
    CANNOT_CREATE_BUILTIN_TOOLSET = "CANNOT_CREATE_BUILTIN_TOOLSET"

    PATH_NOT_FOUND = "PATH_NOT_FOUND"
    PATH_NOT_DIRECTORY = "PATH_NOT_DIRECTORY"
    PATH_ACCESS_DENIED = "PATH_ACCESS_DENIED"

    TASK_MESSAGE_NOT_FOUND = "TASK_MESSAGE_NOT_FOUND"
    TASK_RESOURCE_NOT_FOUND = "TASK_RESOURCE_NOT_FOUND"
    TASK_RESOURCE_SHOULD_HAVE_FILENAME_AND_CONTENTTYPE = "TASK_RESOURCE_SHOULD_HAVE_FILENAME_AND_CONTENTTYPE"

    WORKSPACE_NOTES_LOCKED_BY_RUNNING_TASK = "WORKSPACE_NOTES_LOCKED_BY_RUNNING_TASK"

    INVALID_SKILL_ARCHIVE = "INVALID_SKILL_ARCHIVE"

    SUMMARIZE_TITLE_FAILED = "SUMMARIZE_TITLE_FAILED"

class ApiError(Exception):
    """Base class for all API errors."""
    def __init__(self, status_code: int, error_code: ApiErrorCode | McpConnectionErrorCode, *args) -> None:
        super().__init__(*args)
        self.status_code = status_code
        self.error_code = error_code

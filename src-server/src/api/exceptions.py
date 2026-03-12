from enum import Enum
from ..agent.tool.toolset_wrapper.mcp_toolset import McpConnectErrorCode


class ApiErrorCode(str, Enum):
    TOOL_CALL_NOT_FOUND = "TOOL_CALL_NOT_FOUND"
    CANNOT_CREATE_BUILTIN_TOOLSET = "CANNOT_CREATE_BUILTIN_TOOLSET"

    PATH_NOT_FOUND = "PATH_NOT_FOUND"
    PATH_NOT_DIRECTORY = "PATH_NOT_DIRECTORY"
    PATH_ACCESS_DENIED = "PATH_ACCESS_DENIED"

class ApiError(Exception):
    """Base class for all API errors."""
    def __init__(self, status_code: int, error_code: ApiErrorCode | McpConnectErrorCode, *args) -> None:
        super().__init__(*args)
        self.status_code = status_code
        self.error_code = error_code

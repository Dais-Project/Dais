from enum import Enum


class ServiceStatusCode(str, Enum):
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    BAD_REQUEST = "BAD_REQUEST"
    UNAVAILABLE = "UNAVAILABLE"

    @staticmethod
    def status_code_map(code: ServiceStatusCode) -> int:
        from fastapi import status
        return ({
            ServiceStatusCode.NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ServiceStatusCode.CONFLICT: status.HTTP_409_CONFLICT,
            ServiceStatusCode.BAD_REQUEST: status.HTTP_400_BAD_REQUEST,
            ServiceStatusCode.UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
        }).get(code, status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceErrorCode(str, Enum):
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"

    WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"

    MODEL_NOT_FOUND = "MODEL_NOT_FOUND"

    PROVIDER_NOT_FOUND = "PROVIDER_NOT_FOUND"

    TASK_NOT_FOUND = "TASK_NOT_FOUND"

    TOOLSET_NOT_FOUND = "TOOLSET_NOT_FOUND"
    TOOLSET_INTERNAL_KEY_ALREADY_EXISTS = "TOOLSET_INTERNAL_KEY_ALREADY_EXISTS"

    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"

class ServiceError(Exception):
    def __init__(self, status_code: ServiceStatusCode, error_code: ServiceErrorCode, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message

class NotFoundError(ServiceError):
    def __init__(self, error_code: ServiceErrorCode, resource_type: str, identifier: int | str) -> None:
        message = f"{resource_type} '{identifier}' not found"
        super().__init__(ServiceStatusCode.NOT_FOUND, error_code, message)
        self.resource_type = resource_type
        self.identifier = identifier

class ConflictError(ServiceError):
    def __init__(self, error_code: ServiceErrorCode, message: str) -> None:
        super().__init__(ServiceStatusCode.CONFLICT, error_code, message)

class BadRequestError(ServiceError):
    def __init__(self, error_code: ServiceErrorCode, message: str) -> None:
        super().__init__(ServiceStatusCode.BAD_REQUEST, error_code, message)

class UnavailableError(ServiceError):
    def __init__(self, error_code: ServiceErrorCode, message: str) -> None:
        super().__init__(ServiceStatusCode.UNAVAILABLE, error_code, message)

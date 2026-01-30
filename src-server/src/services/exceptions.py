"""Service layer error types.

This module defines custom error types for the service layer.
These errors should not inherit from framework-specific exception classes.
"""
from enum import Enum

class ServiceErrorCode(str, Enum):
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    BAD_REQUEST = "BAD_REQUEST"

class ServiceError(Exception):
    """Base class for all service layer errors."""
    def __init__(self, code: ServiceErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

class NotFoundError(ServiceError):
    """Raised when a requested resource is not found."""

    def __init__(self, resource_type: str, identifier: int | str) -> None:
        message = f"{resource_type} '{identifier}' not found"
        super().__init__(ServiceErrorCode.NOT_FOUND, message)
        self.resource_type = resource_type
        self.identifier = identifier

class ConflictError(ServiceError):
    """Raised when there is a conflict with the current state of the resource."""
    def __init__(self, message: str) -> None:
        super().__init__(ServiceErrorCode.CONFLICT, message)

class BadRequestError(ServiceError):
    """Raised when the request is invalid or cannot be processed."""
    def __init__(self, message: str) -> None:
        super().__init__(ServiceErrorCode.BAD_REQUEST, message)

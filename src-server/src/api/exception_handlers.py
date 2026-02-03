import functools
from typing import Any, Callable, Coroutine, TypedDict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from loguru import logger
from ..services.exceptions import ServiceError, ServiceErrorCode

SERVICE_ERROR_STATUS_CODES: dict[ServiceErrorCode, int] = {
    ServiceErrorCode.NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ServiceErrorCode.CONFLICT: status.HTTP_409_CONFLICT,
    ServiceErrorCode.BAD_REQUEST: status.HTTP_400_BAD_REQUEST,
}

class ErrorResponseContent(TypedDict):
    error_code: str
    message: str

def _specific_exception_handler[E: Exception](expected_exception: type[E]):
    """
    Since the app.add_exception_handler() requires the passed in handler function
    to have the signature of (request: Request, exc: Exception), but we want to
    have the exc to be the specific type, we use this decorator to wrap the handler
    function and cast the exc to the specific type before passing it to the handler function.
    """
    def decorator(
        func: Callable[[Request, E], Coroutine[Any, Any, JSONResponse]]
    ) -> Callable[[Request, Exception], Coroutine[Any, Any, JSONResponse]]:
        @functools.wraps(func)
        async def wrapper(request: Request, exc: Exception) -> JSONResponse:
            if not isinstance(exc, expected_exception):
                raise exc
            return await func(request, exc)
        return wrapper
    return decorator

# --- --- --- --- --- ---

_logger = logger.bind(name="ExceptionHandlers")

@_specific_exception_handler(ServiceError)
async def handle_service_error(_: Request, exc: ServiceError) -> JSONResponse:
    """Handle service layer errors and convert them to HTTP responses."""
    status_code = SERVICE_ERROR_STATUS_CODES.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(status_code=status_code,
                        content=ErrorResponseContent(error_code=exc.code.value,
                                                     message=exc.message))

# pydantic schema validation error
@_specific_exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    _logger.error(exc)
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                        content=ErrorResponseContent(error_code="VALIDATION_ERROR",
                                                     message="Invalid request parameters"))

@_specific_exception_handler(HTTPException)
async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code,
                        content=ErrorResponseContent(error_code="UNKNOWN",
                                                     message=exc.detail))

async def handle_unexpected_exception(_: Request, exc: Exception) -> JSONResponse:
    _logger.error(f"Unexpected server error: {exc}")
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        content=ErrorResponseContent(error_code="UNKNOWN",
                                                     message="Unexpected server error"))

import secrets

from fastapi import status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.auth import DESKTOP_AUTH_HEADER
from src.auth import get_desktop_auth_token


class DesktopAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS" or (
            request.url.path != "/api"
            and not request.url.path.startswith("/api/")
        ):
            return await call_next(request)

        expected_token = get_desktop_auth_token()
        request_token = request.headers.get(DESKTOP_AUTH_HEADER)
        if (expected_token is None
            or request_token is None
            or not secrets.compare_digest(request_token, expected_token)):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error_code": "UNAUTHENTICATED",
                    "message": "Authentication required",
                },
            )

        return await call_next(request)

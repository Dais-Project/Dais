import secrets
from dataclasses import dataclass

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.api.auth_cookie import (
    AUTH_SESSION_COOKIE_NAME,
    set_auth_session_cookie,
)
from src.auth import DESKTOP_AUTH_HEADER
from src.auth import get_desktop_auth_token
from src.db.models import auth_session as auth_session_models
from src.repositories.auth_session import AuthSessionRepository
from src.services.auth_session import (
    AuthSessionInvalidError,
    AuthSessionService,
)


AUTH_SESSION_REFRESH_THRESHOLD = 13 * 24 * 60 * 60
PUBLIC_API_ROUTES = {
    ("GET", "/api/health/"),
    ("POST", "/api/auth/browser-login"),
}
DESKTOP_ONLY_API_ROUTES = {
    ("POST", "/api/auth/login-code"),
}


def _create_unauthenticated_response() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "error_code": "UNAUTHENTICATED",
            "message": "Authentication required",
        },
    )


@dataclass(frozen=True)
class BrowserAuthentication:
    token: str
    session: auth_session_models.AuthSession

class AuthenticationMiddleware(BaseHTTPMiddleware):
    @staticmethod
    def _is_api_request(request: Request) -> bool:
        path = request.url.path
        return path == "/api" or path.startswith("/api/")

    @staticmethod
    def _is_desktop_authenticated(request: Request) -> bool:
        expected_token = get_desktop_auth_token()
        request_token = request.headers.get(DESKTOP_AUTH_HEADER)
        return (
            expected_token is not None
            and request_token is not None
            and request_token.isascii() # compare_digest does not support non-ASCII strings.
            and secrets.compare_digest(request_token, expected_token)
        )

    @staticmethod
    async def _get_browser_session(request: Request, service: AuthSessionService) -> BrowserAuthentication | None:
        token = request.cookies.get(AUTH_SESSION_COOKIE_NAME)
        if token is None: return None

        try:
            session = await service.get_valid(token)
        except AuthSessionInvalidError:
            return None

        return BrowserAuthentication(token=token, session=session)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method.lower() == "options" or not self._is_api_request(request):
            return await call_next(request)

        route = (request.method, request.url.path)
        if route in PUBLIC_API_ROUTES:
            return await call_next(request)
        elif route in DESKTOP_ONLY_API_ROUTES:
            desktop_authenticated = self._is_desktop_authenticated(request)
            if not desktop_authenticated:
                return _create_unauthenticated_response()
            return await call_next(request)

        # auth required routes
        db_session: AsyncSession = request.state.db_session
        service = AuthSessionService(AuthSessionRepository(db_session))

        browser_session = await self._get_browser_session(request, service)
        if browser_session is None:
            return _create_unauthenticated_response()

        response = await call_next(request)
        if response.status_code >= 400: return response

        should_refresh = browser_session.session.ttl < AUTH_SESSION_REFRESH_THRESHOLD
        if not should_refresh: return response

        refreshed_session = await service.refresh_expiration(browser_session.session)
        set_auth_session_cookie(
            response,
            token=browser_session.token,
            expires_at=refreshed_session.expires_at,
        )
        return response

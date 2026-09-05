from datetime import UTC, datetime

from fastapi import APIRouter, Request, Response, status

from src.api.exceptions import ApiError, ApiErrorCode
from src.schemas import auth as auth_schemas
from src.services.auth_session import AUTH_SESSION_TTL_SECONDS

from ..dependencies.auth_session import (
    AUTH_SESSION_COOKIE_NAME,
    AuthSessionCookieDep,
    AuthSessionServiceDep,
    LoginCodeServiceDep,
)


auth_router = APIRouter(tags=["auth"])


def set_auth_session_cookie(response: Response,
                            *,
                            token: str,
                            expires_at: int):
    response.set_cookie(
        key=AUTH_SESSION_COOKIE_NAME,
        value=token,
        max_age=AUTH_SESSION_TTL_SECONDS,
        expires=datetime.fromtimestamp(expires_at, tz=UTC),
        path="/",
        secure=False,
        httponly=True,
        samesite="strict",
    )

def clear_auth_session_cookie(response: Response):
    response.delete_cookie(
        key=AUTH_SESSION_COOKIE_NAME,
        path="/",
        secure=False,
        httponly=True,
        samesite="strict",
    )


@auth_router.post("/login-code", response_model=auth_schemas.LoginCodeRead)
async def create_login_code(service: LoginCodeServiceDep):
    login_code = await service.generate()
    return auth_schemas.LoginCodeRead.model_validate(login_code)

@auth_router.post("/browser-login", response_model=auth_schemas.AuthSessionRead)
async def browser_login(
    login_code_service: LoginCodeServiceDep,
    auth_session_service: AuthSessionServiceDep,
    request: Request,
    response: Response,
    body: auth_schemas.BrowserLogin,
):
    await login_code_service.consume(body.code)
    created = await auth_session_service.create(
        user_agent=request.headers.get("user-agent"),
        remote_address=request.client.host if request.client is not None else None,
    )
    set_auth_session_cookie(
        response,
        token=created.token,
        expires_at=created.session.expires_at,
    )
    return auth_schemas.AuthSessionRead(
        authenticated=True,
        expires_at=created.session.expires_at,
    )

@auth_router.get("/session", response_model=auth_schemas.AuthSessionRead)
async def get_auth_session(service: AuthSessionServiceDep, token: AuthSessionCookieDep = None):
    if token is None:
        raise ApiError(
            status.HTTP_401_UNAUTHORIZED,
            ApiErrorCode.UNAUTHENTICATED,
            "Authentication required",
        )
    session = await service.get_valid(token)
    if session is None:
        raise ApiError(
            status.HTTP_401_UNAUTHORIZED,
            ApiErrorCode.UNAUTHENTICATED,
            "Authentication required",
        )
    return auth_schemas.AuthSessionRead(
        authenticated=True,
        expires_at=session.expires_at,
    )

@auth_router.delete("/session", status_code=status.HTTP_204_NO_CONTENT)
async def delete_auth_session(
    response: Response,
    service: AuthSessionServiceDep,
    token: AuthSessionCookieDep = None,
):
    if token is not None:
        await service.delete(token)
    clear_auth_session_cookie(response)

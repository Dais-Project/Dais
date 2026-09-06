from fastapi import APIRouter, Request, Response, status

from src.schemas import auth as auth_schemas

from ..auth_cookie import set_auth_session_cookie, clear_auth_session_cookie
from ..dependencies.auth_session import (
    AuthSessionCookieDep,
    AuthSessionServiceDep,
    LoginCodeServiceDep,
)


auth_router = APIRouter(tags=["auth"])


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
async def get_auth_session(service: AuthSessionServiceDep, token: AuthSessionCookieDep):
    session = await service.get_valid(token)
    return auth_schemas.AuthSessionRead(
        authenticated=True,
        expires_at=session.expires_at,
    )

@auth_router.delete("/session", status_code=status.HTTP_204_NO_CONTENT)
async def delete_auth_session(
    service: AuthSessionServiceDep,
    token: AuthSessionCookieDep,
    response: Response,
):
    await service.delete(token)
    clear_auth_session_cookie(response)

from typing import Annotated

from fastapi import Cookie, Depends

from src.repositories.auth_session import AuthSessionRepository
from src.services.auth_session import AuthSessionService
from src.services.login_code import LoginCodeService, use_login_code_service

from .db_session import DbSessionDep


AUTH_SESSION_COOKIE_NAME = "dais_browser_session"


def get_auth_session_service(db_session: DbSessionDep) -> AuthSessionService:
    return AuthSessionService(AuthSessionRepository(db_session))


def get_login_code_service() -> LoginCodeService:
    return use_login_code_service()


AuthSessionServiceDep = Annotated[
    AuthSessionService,
    Depends(get_auth_session_service),
]
LoginCodeServiceDep = Annotated[
    LoginCodeService,
    Depends(get_login_code_service),
]
AuthSessionCookieDep = Annotated[
    str | None,
    Cookie(alias=AUTH_SESSION_COOKIE_NAME),
]

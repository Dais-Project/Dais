from datetime import UTC, datetime

from starlette.responses import Response

from src.services.auth_session import AUTH_SESSION_TTL_SECONDS


AUTH_SESSION_COOKIE_NAME = "dais_browser_session"


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

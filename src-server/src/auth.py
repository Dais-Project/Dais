DESKTOP_AUTH_HEADER = "X-Dais-Desktop-Token"

_desktop_auth_token: str | None = None


def set_desktop_auth_token(token: str | None) -> None:
    global _desktop_auth_token
    _desktop_auth_token = token


def get_desktop_auth_token() -> str | None:
    return _desktop_auth_token

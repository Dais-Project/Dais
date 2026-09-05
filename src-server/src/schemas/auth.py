from pydantic import Field

from . import DTOBase


class LoginCodeRead(DTOBase):
    code: str
    expires_at: int

class BrowserLogin(DTOBase):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

class AuthSessionRead(DTOBase):
    authenticated: bool
    expires_at: int

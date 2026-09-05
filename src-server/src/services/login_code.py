import asyncio
import secrets
import time
from dataclasses import dataclass

from .exceptions import BadRequestError, ServiceErrorCode


LOGIN_CODE_LENGTH = 6
LOGIN_CODE_TTL_SECONDS = 5 * 60


class LoginCodeInvalidError(BadRequestError):
    def __init__(self):
        super().__init__(
            ServiceErrorCode.LOGIN_CODE_INVALID,
            "Login code is invalid or expired",
        )


@dataclass(frozen=True)
class LoginCode:
    code: str
    expires_at: int


class LoginCodeService:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._code: str | None = None
        self._clearing_task: asyncio.Task[None] | None = None

    async def generate(self) -> LoginCode:
        def clear_task_reference(task: asyncio.Task[None]) -> None:
            if self._clearing_task is task:
                self._clearing_task = None

        async with self._lock:
            self._cancel_clearing_task()

            now = int(time.time())
            code = self._generate_code()
            expires_at = now + LOGIN_CODE_TTL_SECONDS
            login_code = LoginCode(code=code, expires_at=expires_at)
            self._code = code

            self._clearing_task = asyncio.create_task(self._clear_after(login_code))
            self._clearing_task.add_done_callback(clear_task_reference)
            return login_code

    async def consume(self, code: str) -> None:
        async with self._lock:
            current_code = self._code
            if (current_code is None
                or not code.isascii() # compare_digest does not support non-ASCII strings.
                or not secrets.compare_digest(code, current_code)):
                raise LoginCodeInvalidError()

            self._cancel_clearing_task()
            self._code = None

    def _generate_code(self) -> str:
        value = secrets.randbelow(10 ** LOGIN_CODE_LENGTH)
        return f"{value:0{LOGIN_CODE_LENGTH}d}"

    async def _clear_after(self, login_code: LoginCode) -> None:
        await asyncio.sleep(max(0, login_code.expires_at - int(time.time())))
        async with self._lock:
            if self._code == login_code.code:
                self._code = None

    def _cancel_clearing_task(self) -> None:
        if self._clearing_task is not None:
            self._clearing_task.cancel()
            self._clearing_task = None

_login_code_service = LoginCodeService()


def use_login_code_service() -> LoginCodeService:
    return _login_code_service

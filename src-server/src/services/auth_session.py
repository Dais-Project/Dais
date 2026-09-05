import hashlib
import secrets
import time
from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.auth_session import AuthSession
from src.repositories.auth_session import AuthSessionRepository


AUTH_SESSION_TTL_SECONDS = 14 * 24 * 60 * 60
AUTH_SESSION_TOKEN_BYTES = 32


@dataclass(frozen=True)
class CreatedAuthSession:
    token: str
    session: AuthSession


class AuthSessionService:
    def __init__(
        self,
        repository: AuthSessionRepository,
        *,
        clock: Callable[[], int] | None = None,
        generate_token: Callable[[int], str] | None = None,
    ):
        self._repository = repository
        self._clock = clock or (lambda: int(time.time()))
        self._generate_token = generate_token or secrets.token_urlsafe

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> AuthSessionService:
        return cls(AuthSessionRepository(db_session))

    async def create(
        self,
        *,
        user_agent: str | None = None,
        remote_address: str | None = None,
    ) -> CreatedAuthSession:
        token = self._generate_token(AUTH_SESSION_TOKEN_BYTES)
        session = await self._repository.create(
            token_digest=self.digest_token(token),
            expires_at=self._clock() + AUTH_SESSION_TTL_SECONDS,
            user_agent=user_agent,
            remote_address=remote_address,
        )
        return CreatedAuthSession(token=token, session=session)

    async def get_valid(self, token: str) -> AuthSession | None:
        return await self._repository.get_valid_by_token_digest(
            self.digest_token(token),
            now=self._clock(),
        )

    async def refresh_expiration(self, session_id: int) -> AuthSession | None:
        return await self._repository.refresh_expiration(
            session_id,
            expires_at=self._clock() + AUTH_SESSION_TTL_SECONDS,
        )

    async def delete(self, token: str) -> bool:
        session = await self.get_valid(token)
        if session is None:
            return False
        return await self._repository.delete(session.id)

    async def delete_all(self) -> int:
        return await self._repository.delete_all()

    async def delete_expired(self) -> int:
        return await self._repository.delete_expired(now=self._clock())

    @staticmethod
    def digest_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

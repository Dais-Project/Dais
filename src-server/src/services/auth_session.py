import hashlib
import secrets
import time
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.auth_session import AuthSession
from src.repositories.auth_session import AuthSessionRepository

from .exceptions import ServiceError, ServiceErrorCode, ServiceStatusCode


AUTH_SESSION_TTL_SECONDS = 14 * 24 * 60 * 60
AUTH_SESSION_TOKEN_BYTES = 32


@dataclass(frozen=True)
class CreatedAuthSession:
    token: str
    session: AuthSession


class AuthSessionInvalidError(ServiceError):
    def __init__(self):
        super().__init__(
            ServiceStatusCode.UNAUTHENTICATED,
            ServiceErrorCode.AUTH_SESSION_INVALID,
            "Authentication session is invalid or expired",
        )


class AuthSessionService:
    def __init__(self, repository: AuthSessionRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> AuthSessionService:
        return cls(AuthSessionRepository(db_session))

    async def create(self,
                     *,
                     user_agent: str | None = None,
                     remote_address: str | None = None) -> CreatedAuthSession:
        token = secrets.token_urlsafe(AUTH_SESSION_TOKEN_BYTES)
        session = await self._repository.create(
            token_digest=self.digest_token(token),
            expires_at=int(time.time()) + AUTH_SESSION_TTL_SECONDS,
            user_agent=user_agent,
            remote_address=remote_address,
        )
        return CreatedAuthSession(token=token, session=session)

    async def get_valid(self, token: str) -> AuthSession:
        session = await self._repository.get_valid_by_token_digest(
            self.digest_token(token),
            now=int(time.time()),
        )
        if session is None:
            raise AuthSessionInvalidError()
        return session

    async def refresh_expiration(self, session: AuthSession) -> AuthSession:
        return await self._repository.refresh_expiration(
            session,
            expires_at=int(time.time()) + AUTH_SESSION_TTL_SECONDS,
        )

    async def delete(self, token: str):
        session = await self.get_valid(token)
        return await self._repository.delete(session)

    async def delete_expired(self) -> int:
        return await self._repository.delete_expired(now=int(time.time()))

    @staticmethod
    def digest_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

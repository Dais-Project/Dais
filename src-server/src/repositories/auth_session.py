from sqlalchemy import select

from src.db.models import auth_session as auth_session_models

from .repository_base import RepositoryBase


class AuthSessionRepository(RepositoryBase[auth_session_models.AuthSession]):
    async def create(self,
                     *,
                     token_digest: str,
                     expires_at: int,
                     user_agent: str | None = None,
                     remote_address: str | None = None) -> auth_session_models.AuthSession:
        session = auth_session_models.AuthSession(
            token_digest=token_digest,
            expires_at=expires_at,
            user_agent=user_agent,
            remote_address=remote_address,
        )
        self._db_session.add(session)
        session_id = await self.flush_and_expunge(session)
        created_session = await self.get_by_id(session_id)
        assert created_session is not None
        return created_session

    async def get_by_id(self, session_id: int) -> auth_session_models.AuthSession | None:
        return await self._db_session.get(
            auth_session_models.AuthSession,
            session_id,
        )

    async def get_valid_by_token_digest(self,
                                        token_digest: str,
                                        *,
                                        now: int) -> auth_session_models.AuthSession | None:
        return await self._db_session.scalar(
            select(auth_session_models.AuthSession).where(
                auth_session_models.AuthSession.token_digest == token_digest,
                auth_session_models.AuthSession.expires_at > now,
            )
        )

    async def refresh_expiration(self,
                                 session_id: int,
                                 *,
                                 expires_at: int) -> auth_session_models.AuthSession | None:
        session = await self.get_by_id(session_id)
        if session is None: return None
        session.expires_at = expires_at
        await self.flush_and_expunge(session)
        return await self.get_by_id(session_id)

    async def delete(self, session_id: int) -> bool:
        session = await self.get_by_id(session_id)
        if session is None: return False
        await self._db_session.delete(session)
        await self._db_session.flush()
        return True

    async def delete_all(self) -> int:
        sessions = list(
            (await self._db_session.scalars(
                select(auth_session_models.AuthSession)
            )).all()
        )
        for session in sessions:
            await self._db_session.delete(session)
        await self._db_session.flush()
        return len(sessions)

    async def delete_expired(self, *, now: int) -> int:
        sessions = list(
            (await self._db_session.scalars(
                select(auth_session_models.AuthSession).where(
                    auth_session_models.AuthSession.expires_at <= now
                )
            )).all()
        )
        for session in sessions:
            await self._db_session.delete(session)
        await self._db_session.flush()
        return len(sessions)

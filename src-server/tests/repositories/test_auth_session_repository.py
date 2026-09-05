import time

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine

from src.db.models import Base
from src.repositories.auth_session import AuthSessionRepository


@pytest.fixture
def auth_session_repository(
    db_session: AsyncSession,
) -> AuthSessionRepository:
    return AuthSessionRepository(db_session)


@pytest.mark.integration
class TestAuthSessionRepository:
    @pytest.mark.asyncio
    async def test_create_and_get_valid_session(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())

        created = await auth_session_repository.create(
            token_digest="digest-a",
            expires_at=now + 14 * 24 * 60 * 60,
            user_agent="Test browser",
            remote_address="192.0.2.1",
        )
        loaded = await auth_session_repository.get_valid_by_token_digest(
            "digest-a",
            now=now,
        )

        assert loaded is not None
        assert loaded.id == created.id
        assert loaded.token_digest == "digest-a"
        assert loaded.user_agent == "Test browser"
        assert loaded.remote_address == "192.0.2.1"

    @pytest.mark.asyncio
    async def test_expired_session_is_not_valid(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())
        await auth_session_repository.create(
            token_digest="expired-digest",
            expires_at=now,
        )

        loaded = await auth_session_repository.get_valid_by_token_digest(
            "expired-digest",
            now=now,
        )

        assert loaded is None

    @pytest.mark.asyncio
    async def test_refresh_expiration_updates_session(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())
        created = await auth_session_repository.create(
            token_digest="refresh-digest",
            expires_at=now + 24 * 60 * 60,
        )
        refreshed_expiration = now + 14 * 24 * 60 * 60

        refreshed = await auth_session_repository.refresh_expiration(
            created.id,
            expires_at=refreshed_expiration,
        )

        assert refreshed is not None
        assert refreshed.expires_at == refreshed_expiration

    @pytest.mark.asyncio
    async def test_session_persists_across_database_reopen(self, tmp_path):
        database_path = tmp_path / "auth-session.sqlite"
        database_url = f"sqlite+aiosqlite:///{database_path}"
        now = int(time.time())
        expires_at = now + 14 * 24 * 60 * 60

        first_engine = create_async_engine(database_url)
        async with first_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        first_session_factory = async_sessionmaker(
            first_engine,
            expire_on_commit=False,
        )
        async with first_session_factory.begin() as session:
            repository = AuthSessionRepository(session)
            await repository.create(
                token_digest="persistent-digest",
                expires_at=expires_at,
            )
        await first_engine.dispose()

        second_engine = create_async_engine(database_url)
        second_session_factory = async_sessionmaker(
            second_engine,
            expire_on_commit=False,
        )
        async with second_session_factory() as session:
            repository = AuthSessionRepository(session)
            loaded = await repository.get_valid_by_token_digest(
                "persistent-digest",
                now=now,
            )
        await second_engine.dispose()

        assert loaded is not None
        assert loaded.expires_at == expires_at

    @pytest.mark.asyncio
    async def test_delete_invalidates_session(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())
        created = await auth_session_repository.create(
            token_digest="delete-digest",
            expires_at=now + 14 * 24 * 60 * 60,
        )

        deleted = await auth_session_repository.delete(created.id)
        loaded = await auth_session_repository.get_valid_by_token_digest(
            "delete-digest",
            now=now,
        )

        assert deleted is True
        assert loaded is None

    @pytest.mark.asyncio
    async def test_delete_all_removes_every_session(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())
        await auth_session_repository.create(
            token_digest="all-a",
            expires_at=now + 14 * 24 * 60 * 60,
        )
        await auth_session_repository.create(
            token_digest="all-b",
            expires_at=now + 14 * 24 * 60 * 60,
        )

        deleted_count = await auth_session_repository.delete_all()

        assert deleted_count == 2
        assert (
            await auth_session_repository.get_valid_by_token_digest(
                "all-a",
                now=now,
            )
            is None
        )
        assert (
            await auth_session_repository.get_valid_by_token_digest(
                "all-b",
                now=now,
            )
            is None
        )

    @pytest.mark.asyncio
    async def test_delete_expired_preserves_valid_sessions(
        self,
        auth_session_repository: AuthSessionRepository,
    ):
        now = int(time.time())
        await auth_session_repository.create(
            token_digest="cleanup-expired",
            expires_at=now - 1,
        )
        valid = await auth_session_repository.create(
            token_digest="cleanup-valid",
            expires_at=now + 14 * 24 * 60 * 60,
        )

        deleted_count = await auth_session_repository.delete_expired(now=now)

        assert deleted_count == 1
        assert await auth_session_repository.get_by_id(valid.id) is not None

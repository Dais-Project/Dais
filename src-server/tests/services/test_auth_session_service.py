import hashlib

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.auth_session import AuthSessionRepository
from src.services.auth_session import (
    AUTH_SESSION_TOKEN_BYTES,
    AUTH_SESSION_TTL_SECONDS,
    AuthSessionService,
)


class MutableClock:
    def __init__(self, now: int):
        self.now = now

    def __call__(self) -> int:
        return self.now


@pytest.fixture
def auth_session_service(
    db_session: AsyncSession,
) -> AuthSessionService:
    return AuthSessionService.from_db_session(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestAuthSessionService:
    @pytest.mark.asyncio
    async def test_create_persists_digest_and_fourteen_day_expiration(
        self,
        db_session: AsyncSession,
    ):
        clock = MutableClock(1_000)
        generated_sizes: list[int] = []

        def generate_token(size: int) -> str:
            generated_sizes.append(size)
            return "raw-session-token"

        service = AuthSessionService(
            AuthSessionRepository(db_session),
            clock=clock,
            generate_token=generate_token,
        )

        created = await service.create(
            user_agent="Test browser",
            remote_address="192.0.2.1",
        )

        assert generated_sizes == [AUTH_SESSION_TOKEN_BYTES]
        assert created.token == "raw-session-token"
        assert created.session.expires_at == 1_000 + AUTH_SESSION_TTL_SECONDS
        assert created.session.token_digest == hashlib.sha256(
            b"raw-session-token"
        ).hexdigest()
        assert created.session.token_digest != created.token
        assert created.session.user_agent == "Test browser"
        assert created.session.remote_address == "192.0.2.1"

    @pytest.mark.asyncio
    async def test_valid_token_can_be_loaded(
        self,
        auth_session_service: AuthSessionService,
    ):
        created = await auth_session_service.create()

        loaded = await auth_session_service.get_valid(created.token)

        assert loaded is not None
        assert loaded.id == created.session.id

    @pytest.mark.asyncio
    async def test_wrong_and_expired_tokens_are_invalid(
        self,
        db_session: AsyncSession,
    ):
        clock = MutableClock(1_000)
        service = AuthSessionService(
            AuthSessionRepository(db_session),
            clock=clock,
            generate_token=lambda _: "raw-session-token",
        )
        created = await service.create()

        assert await service.get_valid("wrong-token") is None

        clock.now = created.session.expires_at
        assert await service.get_valid(created.token) is None

    @pytest.mark.asyncio
    async def test_delete_invalidates_session(
        self,
        auth_session_service: AuthSessionService,
    ):
        created = await auth_session_service.create()

        assert await auth_session_service.delete(created.token) is True
        assert await auth_session_service.get_valid(created.token) is None
        assert await auth_session_service.delete(created.token) is False

    @pytest.mark.asyncio
    async def test_refresh_expiration_uses_current_time(
        self,
        db_session: AsyncSession,
    ):
        clock = MutableClock(1_000)
        service = AuthSessionService(
            AuthSessionRepository(db_session),
            clock=clock,
        )
        created = await service.create()
        clock.now = 2_000

        refreshed = await service.refresh_expiration(created.session.id)

        assert refreshed is not None
        assert refreshed.expires_at == 2_000 + AUTH_SESSION_TTL_SECONDS

    @pytest.mark.asyncio
    async def test_new_service_can_validate_existing_token(
        self,
        db_session: AsyncSession,
    ):
        first_service = AuthSessionService(
            AuthSessionRepository(db_session),
            generate_token=lambda _: "persistent-token",
        )
        created = await first_service.create()
        second_service = AuthSessionService(AuthSessionRepository(db_session))

        loaded = await second_service.get_valid(created.token)

        assert loaded is not None
        assert loaded.id == created.session.id

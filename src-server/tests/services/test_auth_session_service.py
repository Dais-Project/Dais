import hashlib

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.auth_session import AuthSessionRepository
from src.services.auth_session import (
    AUTH_SESSION_TOKEN_BYTES,
    AUTH_SESSION_TTL_SECONDS,
    AuthSessionInvalidError,
    AuthSessionService,
)


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
        mocker,
    ):
        generate_token = mocker.patch(
            "src.services.auth_session.secrets.token_urlsafe",
            return_value="raw-session-token",
        )
        mocker.patch(
            "src.services.auth_session.time.time",
            return_value=1_000,
        )
        service = AuthSessionService(AuthSessionRepository(db_session))

        created = await service.create(
            user_agent="Test browser",
            remote_address="192.0.2.1",
        )

        generate_token.assert_called_once_with(AUTH_SESSION_TOKEN_BYTES)
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
        mocker,
    ):
        clock = mocker.patch(
            "src.services.auth_session.time.time",
            return_value=1_000,
        )
        mocker.patch(
            "src.services.auth_session.secrets.token_urlsafe",
            return_value="raw-session-token",
        )
        service = AuthSessionService(AuthSessionRepository(db_session))
        created = await service.create()

        with pytest.raises(AuthSessionInvalidError):
            await service.get_valid("wrong-token")

        clock.return_value = created.session.expires_at
        with pytest.raises(AuthSessionInvalidError):
            await service.get_valid(created.token)

    @pytest.mark.asyncio
    async def test_delete_invalidates_session(
        self,
        auth_session_service: AuthSessionService,
    ):
        created = await auth_session_service.create()

        assert await auth_session_service.delete(created.token) is True
        with pytest.raises(AuthSessionInvalidError):
            await auth_session_service.get_valid(created.token)
        with pytest.raises(AuthSessionInvalidError):
            await auth_session_service.delete(created.token)

    @pytest.mark.asyncio
    async def test_refresh_expiration_uses_current_time(
        self,
        db_session: AsyncSession,
        mocker,
    ):
        clock = mocker.patch(
            "src.services.auth_session.time.time",
            return_value=1_000,
        )
        service = AuthSessionService(AuthSessionRepository(db_session))
        created = await service.create()
        clock.return_value = 2_000

        refreshed = await service.refresh_expiration(created.session)

        assert refreshed is not None
        assert refreshed.expires_at == 2_000 + AUTH_SESSION_TTL_SECONDS

    @pytest.mark.asyncio
    async def test_new_service_can_validate_existing_token(
        self,
        db_session: AsyncSession,
        mocker,
    ):
        mocker.patch(
            "src.services.auth_session.secrets.token_urlsafe",
            return_value="persistent-token",
        )
        first_service = AuthSessionService(AuthSessionRepository(db_session))
        created = await first_service.create()
        second_service = AuthSessionService(AuthSessionRepository(db_session))

        loaded = await second_service.get_valid(created.token)

        assert loaded is not None
        assert loaded.id == created.session.id

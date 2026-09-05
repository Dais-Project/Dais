import asyncio

import pytest

from src.services.exceptions import ServiceErrorCode
from src.services.login_code import (
    LOGIN_CODE_TTL_SECONDS,
    LoginCodeInvalidError,
    LoginCodeService,
)


@pytest.mark.service
class TestLoginCodeService:
    @pytest.mark.asyncio
    async def test_generate_returns_six_digits_and_preserves_leading_zero(
        self,
        mocker,
    ):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            return_value=42,
        )
        mocker.patch(
            "src.services.login_code.time.time",
            return_value=1_000,
        )
        service = LoginCodeService()

        login_code = await service.generate()

        assert login_code.code == "000042"
        assert login_code.expires_at == 1_000 + LOGIN_CODE_TTL_SECONDS
        await service.consume(login_code.code)

    @pytest.mark.asyncio
    async def test_generate_replaces_previous_code(self, mocker):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            side_effect=[123456, 654321],
        )
        service = LoginCodeService()
        first = await service.generate()
        second = await service.generate()

        with pytest.raises(LoginCodeInvalidError):
            await service.consume(first.code)
        await service.consume(second.code)

    @pytest.mark.asyncio
    async def test_consume_only_succeeds_once(self, mocker):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            return_value=123456,
        )
        service = LoginCodeService()
        login_code = await service.generate()

        await service.consume(login_code.code)

        with pytest.raises(LoginCodeInvalidError) as exc_info:
            await service.consume(login_code.code)
        assert exc_info.value.error_code == ServiceErrorCode.LOGIN_CODE_INVALID

    @pytest.mark.asyncio
    async def test_invalid_code_does_not_consume_current_code(self, mocker):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            return_value=123456,
        )
        service = LoginCodeService()
        login_code = await service.generate()

        with pytest.raises(LoginCodeInvalidError):
            await service.consume("abcdef")
        with pytest.raises(LoginCodeInvalidError):
            await service.consume("１２３４５６")

        await service.consume(login_code.code)

    @pytest.mark.asyncio
    async def test_expiration_task_clears_code(self, mocker):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            return_value=123456,
        )
        mocker.patch(
            "src.services.login_code.LOGIN_CODE_TTL_SECONDS",
            0,
        )
        service = LoginCodeService()
        login_code = await service.generate()
        await asyncio.sleep(0)
        await asyncio.sleep(0)

        with pytest.raises(LoginCodeInvalidError):
            await service.consume(login_code.code)

    @pytest.mark.asyncio
    async def test_concurrent_consumers_allow_at_most_one_success(self, mocker):
        mocker.patch(
            "src.services.login_code.secrets.randbelow",
            return_value=123456,
        )
        service = LoginCodeService()
        login_code = await service.generate()

        async def consume() -> bool:
            try:
                await service.consume(login_code.code)
                return True
            except LoginCodeInvalidError:
                return False

        outcomes = await asyncio.gather(consume(), consume())

        assert outcomes.count(True) == 1
        assert outcomes.count(False) == 1

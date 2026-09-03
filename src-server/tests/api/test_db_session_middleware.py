from types import SimpleNamespace

import pytest

from src.api.middlewares.db_session import DBSessionMiddleware


@pytest.mark.asyncio
async def test_dispatch_commits_successful_response(mocker):
    middleware = DBSessionMiddleware(mocker.Mock())
    session = mocker.AsyncMock()
    request = SimpleNamespace(state=SimpleNamespace(db_session=session))
    response = SimpleNamespace(status_code=204)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    session.commit.assert_awaited_once_with()
    session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_rolls_back_error_response(mocker):
    middleware = DBSessionMiddleware(mocker.Mock())
    session = mocker.AsyncMock()
    request = SimpleNamespace(state=SimpleNamespace(db_session=session))
    response = SimpleNamespace(status_code=409)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    session.rollback.assert_awaited_once_with()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_rolls_back_when_commit_fails(mocker):
    middleware = DBSessionMiddleware(mocker.Mock())
    session = mocker.AsyncMock()
    session.commit.side_effect = RuntimeError("commit failed")
    request = SimpleNamespace(state=SimpleNamespace(db_session=session))
    response = SimpleNamespace(status_code=204)

    with pytest.raises(RuntimeError, match="commit failed"):
        await middleware.dispatch(
            request,
            mocker.AsyncMock(return_value=response),
        )

    session.rollback.assert_awaited_once_with()

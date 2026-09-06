from types import SimpleNamespace

import pytest

from src.api.middlewares.db_session import DBSessionMiddleware


@pytest.fixture
def db_session_factory(mocker):
    session = mocker.AsyncMock()
    session_context = mocker.AsyncMock()
    session_context.__aenter__.return_value = session
    session_context.__aexit__.return_value = None
    factory = mocker.patch(
        "src.api.middlewares.db_session.AsyncSessionLocal",
        return_value=session_context,
    )
    return factory, session


@pytest.mark.asyncio
async def test_dispatch_commits_successful_response(mocker, db_session_factory):
    _, session = db_session_factory
    middleware = DBSessionMiddleware(mocker.Mock())
    request = SimpleNamespace(state=SimpleNamespace())
    response = SimpleNamespace(status_code=204)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    assert request.state.db_session is session
    session.commit.assert_awaited_once_with()
    session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_rolls_back_error_response(mocker, db_session_factory):
    _, session = db_session_factory
    middleware = DBSessionMiddleware(mocker.Mock())
    request = SimpleNamespace(state=SimpleNamespace())
    response = SimpleNamespace(status_code=409)

    result = await middleware.dispatch(
        request,
        mocker.AsyncMock(return_value=response),
    )

    assert result is response
    session.rollback.assert_awaited_once_with()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_rolls_back_when_commit_fails(mocker, db_session_factory):
    _, session = db_session_factory
    session.commit.side_effect = RuntimeError("commit failed")
    middleware = DBSessionMiddleware(mocker.Mock())
    request = SimpleNamespace(state=SimpleNamespace())
    response = SimpleNamespace(status_code=204)

    with pytest.raises(RuntimeError, match="commit failed"):
        await middleware.dispatch(
            request,
            mocker.AsyncMock(return_value=response),
        )

    session.rollback.assert_awaited_once_with()

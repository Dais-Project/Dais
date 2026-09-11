from collections.abc import AsyncIterator
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI

from src.api.dependencies.db_session import get_db_session
from src.api.exception_handlers import handle_api_error
from src.api.exception_handlers import handle_service_error
from src.api.exceptions import ApiError
from src.api.middlewares.authentication import AuthenticationMiddleware
from src.api.middlewares.authentication import SpecialRouteType
from src.api.middlewares.authentication import _get_special_route_type
from src.api.routes.tasks.resource import task_resource_router
from src.auth import DESKTOP_AUTH_HEADER
from src.auth import set_desktop_auth_token
from src.services.exceptions import ServiceError
from src.services.task_resource_access import TaskResourceAccessPayload
from src.services.task_resource_access import TaskResourceAccessService
from src.services.task_resource_access import use_task_resource_access_service
from src.schemas.tasks import runtime as task_runtime_schemas


@pytest.fixture
def access_service() -> TaskResourceAccessService:
    return TaskResourceAccessService(b"a" * 32)


@pytest.fixture
def api_app(access_service: TaskResourceAccessService):
    app = FastAPI()
    app.add_middleware(AuthenticationMiddleware)
    app.include_router(task_resource_router, prefix="/api/task-resources")
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(ServiceError, handle_service_error)

    async def get_test_db_session() -> AsyncIterator[object]:
        yield object()

    app.dependency_overrides[get_db_session] = get_test_db_session
    app.dependency_overrides[use_task_resource_access_service] = lambda: access_service
    return app


@pytest.fixture
async def client(api_app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=api_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
def desktop_auth_token():
    set_desktop_auth_token("desktop-token")
    yield
    set_desktop_auth_token(None)


@pytest.mark.api
@pytest.mark.parametrize(
    ("method", "path", "expected"),
    [
        ("GET", "/api/health/", SpecialRouteType.PUBLIC),
        ("POST", "/api/auth/browser-login", SpecialRouteType.PUBLIC),
        (
            "GET",
            "/api/task-resources/access/token",
            SpecialRouteType.PUBLIC,
        ),
        (
            "GET",
            "/api/task-resources/access/token/extra",
            SpecialRouteType.AUTH_REQUIRED,
        ),
        (
            "POST",
            "/api/task-resources/access/token",
            SpecialRouteType.AUTH_REQUIRED,
        ),
        (
            "POST",
            "/api/auth/login-code",
            SpecialRouteType.DESKTOP_ONLY,
        ),
        ("GET", "/api/workspaces/", SpecialRouteType.AUTH_REQUIRED),
    ],
)
def test_special_route_type(method: str, path: str, expected: SpecialRouteType):
    request = SimpleNamespace(
        method=method,
        url=SimpleNamespace(path=path),
    )

    assert _get_special_route_type(request) is expected


@pytest.mark.api
@pytest.mark.asyncio
async def test_desktop_only_route_rejects_browser_authentication(mocker):
    middleware = AuthenticationMiddleware(mocker.Mock())
    call_next = mocker.AsyncMock()
    request = SimpleNamespace(
        method="POST",
        url=SimpleNamespace(path="/api/auth/login-code"),
        headers={},
        cookies={},
    )

    response = await middleware.dispatch(request, call_next)

    assert response.status_code == 401
    call_next.assert_not_awaited()


@pytest.mark.api
@pytest.mark.asyncio
async def test_access_url_requires_authentication(mocker):
    middleware = AuthenticationMiddleware(mocker.Mock())
    request = SimpleNamespace(
        method="POST",
        url=SimpleNamespace(path="/api/task-resources/access-url"),
        headers={},
        cookies={},
        state=SimpleNamespace(db_session=mocker.Mock()),
    )

    response = await middleware.dispatch(request, mocker.AsyncMock())

    assert response.status_code == 401


@pytest.mark.api
@pytest.mark.asyncio
async def test_authenticated_request_creates_access_url(
    client: httpx.AsyncClient,
):
    response = await client.post(
        "/api/task-resources/access-url",
        headers={DESKTOP_AUTH_HEADER: "desktop-token"},
        json={"task_type": "schedule", "task_id": 1, "resource_id": 2},
    )

    assert response.status_code == 200
    assert response.json()["url"].startswith("/api/task-resources/access/")


@pytest.mark.api
@pytest.mark.asyncio
async def test_signed_resource_supports_range_without_authentication(
    client: httpx.AsyncClient,
    access_service: TaskResourceAccessService,
    mocker,
    tmp_path: Path,
):
    resource_path = tmp_path / "resource.bin"
    resource_path.write_bytes(b"0123456789")
    resource_service = mocker.Mock()
    resource_service.load_task_resource = mocker.AsyncMock(return_value=resource_path)
    mocker.patch(
        "src.api.routes.tasks.resource.TaskResourceService.from_db_session",
        return_value=resource_service,
    )
    token = access_service.create_token(
        TaskResourceAccessPayload(
            task_type=task_runtime_schemas.TaskType.TASK,
            task_id=1,
            resource_id=2,
        )
    )

    response = await client.get(
        f"/api/task-resources/access/{token}",
        headers={"Range": "bytes=2-5"},
    )

    assert response.status_code == 206
    assert response.content == b"2345"
    assert response.headers["content-range"] == "bytes 2-5/10"
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["cache-control"] == "private, no-store"


@pytest.mark.api
@pytest.mark.asyncio
async def test_invalid_signed_resource_returns_401(client: httpx.AsyncClient):
    response = await client.get("/api/task-resources/access/invalid.token")

    assert response.status_code == 401
    assert response.json()["error_code"] == "TASK_RESOURCE_ACCESS_INVALID"

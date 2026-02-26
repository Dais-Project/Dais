from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.api.routes.task.context_file import (
    ContextDirectoryNotFoundError,
    ContextPathError,
    _list_directory,
)
from src.db import get_db_session
from src.services.workspace import WorkspaceService


@pytest.fixture
def client():
    async def override_get_db_session():
        yield object()

    app.dependency_overrides[get_db_session] = override_get_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _mock_workspace_directory(monkeypatch: pytest.MonkeyPatch, workspace_dir: Path):
    async def mock_get_workspace_by_id(self, _: int):
        return SimpleNamespace(directory=str(workspace_dir))

    monkeypatch.setattr(WorkspaceService, "get_workspace_by_id", mock_get_workspace_by_id)


def test_list_context_directory_api_success(
    client: TestClient,
    temp_workspace: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    (temp_workspace / "src").mkdir()
    (temp_workspace / "src" / "components").mkdir()
    (temp_workspace / "src" / "main.ts").write_text("content", encoding="utf-8")

    _mock_workspace_directory(monkeypatch, temp_workspace)

    response = client.get("/api/tasks/files/list", params={"workspace_id": 7, "path": "src"})

    assert response.status_code == 200
    assert response.json() == [
        {"path": "src/components", "name": "components", "type": "folder"},
        {"path": "src/main.ts", "name": "main.ts", "type": "file"},
    ]


def test_list_context_directory_api_bad_request(client: TestClient, temp_workspace: Path, monkeypatch: pytest.MonkeyPatch):
    _mock_workspace_directory(monkeypatch, temp_workspace)

    response = client.get("/api/tasks/files/list", params={"workspace_id": 1, "path": "C:/absolute"})

    assert response.status_code == 400
    assert response.json() == {
        "error_code": "BAD_REQUEST",
        "message": "Path must be a relative path",
    }


def test_list_context_directory_api_not_found(client: TestClient, temp_workspace: Path, monkeypatch: pytest.MonkeyPatch):
    _mock_workspace_directory(monkeypatch, temp_workspace)

    response = client.get("/api/tasks/files/list", params={"workspace_id": 1, "path": "missing"})

    assert response.status_code == 404
    assert response.json() == {
        "error_code": "NOT_FOUND",
        "message": "Context directory 'missing' not found",
    }


def test_list_context_directory_api_path_is_file(client: TestClient, temp_workspace: Path, monkeypatch: pytest.MonkeyPatch):
    (temp_workspace / "note.txt").write_text("note", encoding="utf-8")
    _mock_workspace_directory(monkeypatch, temp_workspace)

    response = client.get("/api/tasks/files/list", params={"workspace_id": 1, "path": "note.txt"})

    assert response.status_code == 400
    assert response.json() == {
        "error_code": "BAD_REQUEST",
        "message": "Path is not a directory",
    }


def test_list_context_directory_api_missing_workspace_id_returns_validation_error(client: TestClient):
    response = client.get("/api/tasks/files/list")

    assert response.status_code == 400
    assert response.json() == {
        "error_code": "VALIDATION_ERROR",
        "message": "Invalid request parameters",
    }


def test_list_directory_filters_hidden_and_sorts(temp_workspace: Path):
    (temp_workspace / "z-folder").mkdir()
    (temp_workspace / "a-folder").mkdir()
    (temp_workspace / "z.txt").write_text("z", encoding="utf-8")
    (temp_workspace / "a.txt").write_text("a", encoding="utf-8")
    (temp_workspace / ".hidden.txt").write_text("hidden", encoding="utf-8")

    symlink_target = temp_workspace / "symlink-target.txt"
    symlink_target.write_text("target", encoding="utf-8")
    symlink_path = temp_workspace / "symlink.txt"
    try:
        symlink_path.symlink_to(symlink_target)
    except (NotImplementedError, OSError):
        pass

    items = _list_directory(temp_workspace.resolve(), ".")

    assert [item.path for item in items] == [
        "a-folder",
        "z-folder",
        "a.txt",
        "symlink-target.txt",
        "z.txt",
    ]


def test_list_directory_empty_directory(temp_workspace: Path):
    (temp_workspace / "empty").mkdir()

    items = _list_directory(temp_workspace.resolve(), "empty")

    assert items == []


def test_list_directory_path_is_file(temp_workspace: Path):
    (temp_workspace / "note.txt").write_text("note", encoding="utf-8")

    with pytest.raises(ContextPathError, match="Path is not a directory"):
        _list_directory(temp_workspace.resolve(), "note.txt")


def test_list_directory_outside_workspace(temp_workspace: Path):
    with pytest.raises(ContextPathError, match="outside workspace"):
        _list_directory(temp_workspace.resolve(), "../")


def test_list_directory_nonexistent_path(temp_workspace: Path):
    with pytest.raises(ContextDirectoryNotFoundError):
        _list_directory(temp_workspace.resolve(), "missing")


def test_list_directory_rejects_absolute_path(temp_workspace: Path):
    with pytest.raises(ContextPathError, match="relative path"):
        _list_directory(temp_workspace.resolve(), str(temp_workspace.resolve()))

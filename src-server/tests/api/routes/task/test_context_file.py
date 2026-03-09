from pathlib import Path

import pytest

from src.api.routes.task.context_file import (
    ContextDirectoryNotFoundError,
    ContextPathError,
    _list_directory,
    _search_file,
)


def test_list_directory_success(temp_workspace: Path):
    (temp_workspace / "src").mkdir()
    (temp_workspace / "src" / "components").mkdir()
    (temp_workspace / "src" / "main.ts").write_text("content", encoding="utf-8")

    items = _list_directory(temp_workspace.resolve(), "src")

    assert [item.model_dump() for item in items] == [
        {"path": "src/components/", "name": "components", "type": "folder"},
        {"path": "src/main.ts", "name": "main.ts", "type": "file"},
    ]


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
        "a-folder/",
        "z-folder/",
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


def test_search_file_applies_cutoff_and_formats_folder_path(monkeypatch: pytest.MonkeyPatch, temp_workspace: Path):
    def fake_scan_cached(root: Path, scan_limit: int):
        assert root == temp_workspace.resolve()
        assert scan_limit == 10_000
        return [
            ("docs", "docs", "folder"),
            ("task-note.txt", "notes/task-note.txt", "file"),
            ("ignore.txt", "misc/ignore.txt", "file"),
        ]

    def fake_wratio(query: str, value: str):
        assert query == "task"
        scores = {
            "docs": 85,
            "task-note.txt": 60,
            "notes/task-note.txt": 55,
            "ignore.txt": 40,
            "misc/ignore.txt": 45,
        }
        return scores.get(value, 0)

    monkeypatch.setattr("src.api.routes.task.context_file._scan_cached", fake_scan_cached)
    monkeypatch.setattr("src.api.routes.task.context_file.fuzz.WRatio", fake_wratio)

    items = _search_file("task", temp_workspace.resolve(), match_limit=10)

    assert [item.model_dump() for item in items] == [
        {"path": "docs/", "name": "docs", "type": "folder"},
        {"path": "notes/task-note.txt", "name": "task-note.txt", "type": "file"},
    ]


def test_search_file_respects_match_limit(monkeypatch: pytest.MonkeyPatch, temp_workspace: Path):
    def fake_scan_cached(root: Path, scan_limit: int):
        assert root == temp_workspace.resolve()
        assert scan_limit == 10_000
        return [
            ("alpha", "alpha", "folder"),
            ("beta.txt", "docs/beta.txt", "file"),
            ("gamma.txt", "docs/gamma.txt", "file"),
        ]

    def fake_wratio(query: str, value: str):
        assert query == "a"
        scores = {
            "alpha": 95,
            "beta.txt": 80,
            "docs/beta.txt": 78,
            "gamma.txt": 70,
            "docs/gamma.txt": 72,
        }
        return scores.get(value, 0)

    monkeypatch.setattr("src.api.routes.task.context_file._scan_cached", fake_scan_cached)
    monkeypatch.setattr("src.api.routes.task.context_file.fuzz.WRatio", fake_wratio)

    items = _search_file("a", temp_workspace.resolve(), match_limit=2)

    assert [item.model_dump() for item in items] == [
        {"path": "alpha/", "name": "alpha", "type": "folder"},
        {"path": "docs/beta.txt", "name": "beta.txt", "type": "file"},
    ]


def test_list_directory_rejects_absolute_path(temp_workspace: Path):
    with pytest.raises(ContextPathError, match="relative path"):
        _list_directory(temp_workspace.resolve(), str(temp_workspace.resolve()))

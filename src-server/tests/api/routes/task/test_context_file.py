from pathlib import Path

import pytest

from src.api.routes.task.context_file import (
    ContextDirectoryNotFoundError,
    ContextPathError,
    _list_directory,
)


def test_list_directory_success(temp_workspace: Path):
    (temp_workspace / "src").mkdir()
    (temp_workspace / "src" / "components").mkdir()
    (temp_workspace / "src" / "main.ts").write_text("content", encoding="utf-8")

    items = _list_directory(temp_workspace.resolve(), "src")

    assert [item.model_dump() for item in items] == [
        {"path": "src/components", "name": "components", "type": "folder"},
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

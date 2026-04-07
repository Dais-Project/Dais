from pathlib import Path

import pytest

from src.api.exceptions import ApiError, ApiErrorCode
from src.api.routes.task.context_file import (
    ContextFileInternalError,
    _list_directory,
    _search_file,
)


@pytest.mark.api
class TestListDirectory:
    def test_list_directory_success(self, temp_workspace: Path):
        (temp_workspace / "src").mkdir()
        (temp_workspace / "src" / "components").mkdir()
        (temp_workspace / "src" / "main.ts").write_text("content", encoding="utf-8")

        items = _list_directory(temp_workspace.resolve(), "src")

        assert [item.model_dump() for item in items] == [
            {"path": "src/components/", "name": "components", "type": "folder"},
            {"path": "src/main.ts", "name": "main.ts", "type": "file"},
        ]

    def test_list_directory_filters_hidden_and_sorts(self, temp_workspace: Path):
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

    def test_list_directory_empty_directory(self, temp_workspace: Path):
        (temp_workspace / "empty").mkdir()

        items = _list_directory(temp_workspace.resolve(), "empty")

        assert items == []

    @pytest.mark.parametrize(
        "path,expected_error,match,error_code",
        [
            ("note.txt", ApiError, None, ApiErrorCode.PATH_NOT_DIRECTORY),
            ("missing", ApiError, None, ApiErrorCode.PATH_NOT_FOUND),
            ("../", ContextFileInternalError, "outside workspace", None),
            (None, ContextFileInternalError, "relative path", None),
        ],
        ids=["path-is-file", "missing-path", "outside-workspace", "absolute-path"],
    )
    def test_list_directory_rejects_invalid_paths(
        self,
        temp_workspace: Path,
        path: str | None,
        expected_error: type[Exception],
        match: str | None,
        error_code: ApiErrorCode | None,
    ):
        (temp_workspace / "note.txt").write_text("note", encoding="utf-8")
        target_path = str(temp_workspace.resolve()) if path is None else path

        with pytest.raises(expected_error, match=match) as exc_info:
            _list_directory(temp_workspace.resolve(), target_path)

        if error_code is not None:
            assert isinstance(exc_info.value, ApiError)
            assert exc_info.value.error_code == error_code


@pytest.mark.api
class TestSearchFile:
    @pytest.mark.parametrize(
        "query,match_limit,scan_result,score_map,expected_items",
        [
            (
                "task",
                10,
                [
                    ("docs", "docs", "folder"),
                    ("task-note.txt", "notes/task-note.txt", "file"),
                    ("ignore.txt", "misc/ignore.txt", "file"),
                ],
                {
                    "docs": 85,
                    "task-note.txt": 60,
                    "notes/task-note.txt": 55,
                    "ignore.txt": 40,
                    "misc/ignore.txt": 45,
                },
                [
                    {"path": "docs/", "name": "docs", "type": "folder"},
                    {"path": "notes/task-note.txt", "name": "task-note.txt", "type": "file"},
                ],
            ),
            (
                "a",
                2,
                [
                    ("alpha", "alpha", "folder"),
                    ("beta.txt", "docs/beta.txt", "file"),
                    ("gamma.txt", "docs/gamma.txt", "file"),
                ],
                {
                    "alpha": 95,
                    "beta.txt": 80,
                    "docs/beta.txt": 78,
                    "gamma.txt": 70,
                    "docs/gamma.txt": 72,
                },
                [
                    {"path": "alpha/", "name": "alpha", "type": "folder"},
                    {"path": "docs/beta.txt", "name": "beta.txt", "type": "file"},
                ],
            ),
        ],
        ids=["cutoff-and-folder-format", "match-limit"],
    )
    def test_search_file_returns_ranked_matches(
        self,
        monkeypatch: pytest.MonkeyPatch,
        temp_workspace: Path,
        query: str,
        match_limit: int,
        scan_result: list[tuple[str, str, str]],
        score_map: dict[str, int],
        expected_items: list[dict[str, str]],
    ):
        def fake_scan_cached(root: Path, scan_limit: int, _slot: int = 0):
            assert root == temp_workspace.resolve()
            assert scan_limit == 10_000
            return scan_result

        def fake_wratio(actual_query: str, value: str):
            assert actual_query == query
            return score_map.get(value, 0)

        monkeypatch.setattr("src.api.routes.task.context_file._scan_cached", fake_scan_cached)
        monkeypatch.setattr("src.api.routes.task.context_file.fuzz.WRatio", fake_wratio)

        items = _search_file(query, temp_workspace.resolve(), match_limit=match_limit)

        assert [item.model_dump() for item in items] == expected_items

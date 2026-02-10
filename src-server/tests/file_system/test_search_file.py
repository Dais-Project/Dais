from pathlib import Path

import pytest
from src.agent.tool.builtin_tools import file_system as file_system_module
from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


class TestSearchFile:
    def _fake_scandir_recursive(self, directory: Path, total_entries: int):
        for index in range(total_entries):
            yield directory / f"file_{index}.txt"

    def test_search_file_basic_matches(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.search_file("*.txt")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file1.txt",
            "file2.txt",
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
            "dir2/file5.txt",
        }

    def test_search_file_limit(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.search_file("*.txt", limit=2)

        assert result["total"] == 2
        assert len(result["matches"]) == 2

    def test_search_file_relative_paths(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.search_file("file3.txt")

        assert result["matches"] == ["dir1/file3.txt"]

    def test_search_file_nonexistent_directory(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        with pytest.raises(FileNotFoundError):
            tool.search_file("*.txt", path="nonexistent")

    def test_search_file_path_is_file(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        with pytest.raises(NotADirectoryError):
            tool.search_file("*.txt", path=filename)

    def test_search_file_stops_at_max_scan_limit(self, temp_workspace, monkeypatch):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        max_scan_limit = 200_000
        total_entries = max_scan_limit + 10

        def fake_scandir_recursive(directory: Path):
            return self._fake_scandir_recursive(directory, total_entries)

        # 使用伪生成器避免创建海量真实文件，但仍覆盖扫描上限逻辑。
        monkeypatch.setattr(file_system_module, "scandir_recursive", fake_scandir_recursive)

        result = tool.search_file("*.txt", limit=max_scan_limit + 5)

        assert result["total"] == max_scan_limit
        assert len(result["matches"]) == max_scan_limit

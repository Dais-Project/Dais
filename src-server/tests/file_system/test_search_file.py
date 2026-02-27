import pytest
from pathlib import Path
from src.agent.tool.builtin_tools import file_system as file_system_module
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestSearchFile:
    def _fake_scandir_recursive(self, directory: Path, total_entries: int):
        for index in range(total_entries):
            yield directory / f"file_{index}.txt"

    def test_search_file_basic_matches(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.search_file("*.txt")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file1.txt",
            "file2.txt",
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
            "dir2/file5.txt",
        }

    def test_search_file_limit(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.search_file("*.txt", limit=2)

        assert result["total"] == 2
        assert len(result["matches"]) == 2

    def test_search_file_relative_paths(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.search_file("file3.txt")

        assert result["matches"] == ["dir1/file3.txt"]

    def test_search_file_nonexistent_directory(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(FileNotFoundError):
            tool.search_file("*.txt", path="nonexistent")

    def test_search_file_path_is_file(self, built_in_toolset_context, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(NotADirectoryError):
            tool.search_file("*.txt", path=filename)

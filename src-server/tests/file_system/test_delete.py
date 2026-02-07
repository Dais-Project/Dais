import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestDelete:
    def test_delete_file(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(filename)

        assert f"'{filename}' deleted successfully" in result
        file_path = Path(temp_workspace) / filename
        assert not file_path.exists()

    def test_delete_empty_directory(self, temp_workspace, empty_directory):
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()

    def test_delete_directory_with_contents(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()

    def test_delete_file_removes_from_read_set(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        tool.read_file(filename)
        abs_path = str(Path(temp_workspace) / filename)
        assert abs_path in tool._read_file_set

        tool.delete(filename)

        assert abs_path not in tool._read_file_set

    def test_delete_unread_file_does_not_affect_read_set(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "unread.txt"

        file_path = Path(temp_workspace) / filename
        file_path.write_text("content", encoding="utf-8")

        result = tool.delete(filename)

        assert "deleted successfully" in result
        assert not file_path.exists()

    def test_delete_nonexistent_path(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.delete("nonexistent_path")

        assert "'nonexistent_path' not found" in str(exc_info.value)

    def test_delete_nested_directory(self, temp_workspace, nested_structure):
        dirname = nested_structure
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert "deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()

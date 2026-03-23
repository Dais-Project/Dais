import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestDelete:
    def test_delete_file(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.delete(filename)

        assert f"'{filename}' deleted successfully" in result
        file_path = temp_workspace / filename
        assert not file_path.exists()

    def test_delete_empty_directory(self, built_in_toolset_context, temp_workspace, empty_directory):
        dirname = empty_directory
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = temp_workspace / dirname
        assert not dir_path.exists()

    def test_delete_directory_with_contents(self, built_in_toolset_context, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = temp_workspace / dirname
        assert not dir_path.exists()

    def test_delete_file_removes_from_read_set(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        tool.read_file(filename)
        abs_path = str(temp_workspace / filename)
        assert abs_path in tool._read_file_set

        tool.delete(filename)

        assert abs_path not in tool._read_file_set

    def test_delete_unread_file_does_not_affect_read_set(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        filename = "unread.txt"

        file_path = temp_workspace / filename
        file_path.write_text("content", encoding="utf-8")

        result = tool.delete(filename)

        assert "deleted successfully" in result
        assert not file_path.exists()

    def test_delete_nonexistent_path(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.delete("nonexistent_path")

        assert "'nonexistent_path' not found" in str(exc_info.value)

    def test_delete_nested_directory(self, built_in_toolset_context, temp_workspace, nested_structure):
        dirname = nested_structure
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.delete(dirname)

        assert "deleted successfully" in result
        dir_path = temp_workspace / dirname
        assert not dir_path.exists()

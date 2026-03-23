import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestListDirectory:
    def test_list_directory_non_recursive(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(".")

        assert "Directory: ." in result
        assert "[dir] dir1" in result
        assert "[dir] dir2" in result
        assert "[file] file1.txt" in result
        assert "[file] file2.txt" in result
        assert "file3.txt" not in result

    def test_list_directory_hides_hidden_files_by_default(
        self,
        built_in_toolset_context,
        temp_workspace,
        directory_with_hidden_and_gitignore,
    ):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(".")

        assert "[file] keep.txt" in result
        assert "[dir] secret" not in result
        assert "[file] secret.txt" not in result
        assert ".gitignore" not in result
        assert "ignore.log" not in result
        assert ".hidden.txt" not in result
        assert ".hidden_dir" not in result

    def test_list_directory_show_all_includes_hidden_and_gitignored(
        self,
        built_in_toolset_context,
        temp_workspace,
        directory_with_hidden_and_gitignore,
    ):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(".", show_all=True)

        assert "[file] keep.txt" in result
        assert "[file] .hidden.txt" in result
        assert "[dir] .hidden_dir" in result
        assert "[file] ignore.log" in result
        assert "[dir] secret" in result
        assert ".gitignore" in result

    def test_list_empty_directory(self, built_in_toolset_context, temp_workspace, empty_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(empty_directory)

        assert "(empty directory)" in result

    def test_list_directory_recursive_unlimited(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(".", recursive=True)

        assert "1 [dir] dir1" in result
        assert "1.1 [dir] subdir1" in result
        assert "file4.txt" in result

    def test_list_directory_recursive_with_depth_limit(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = tool.list_directory(".", recursive=True, max_depth=2)

        assert "[dir] dir1" in result
        assert "[dir] subdir1" in result
        assert "file4.txt" not in result

    def test_list_nonexistent_directory(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(FileNotFoundError):
            tool.list_directory("nonexistent")

    def test_list_file_as_directory(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(NotADirectoryError):
            tool.list_directory(filename)

    def test_list_directory_invalid_max_depth(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(ValueError):
            tool.list_directory(".", recursive=True, max_depth=0)

    def test_list_directory_with_permission_error(self, built_in_toolset_context, temp_workspace, mocker):
        tool = FileSystemToolset(built_in_toolset_context)

        mock_iterdir = mocker.patch("pathlib.Path.iterdir")
        mock_iterdir.side_effect = PermissionError()

        result = tool.list_directory(".")
        assert "Error: Permission denied" in result

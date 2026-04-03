import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestListDirectory:
    @pytest.mark.asyncio
    async def test_list_directory_non_recursive(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".")

        assert "Directory: {}".format(temp_workspace) in result
        assert "1. dir1" in result
        assert "2. dir2" in result
        assert "3. file1.txt" in result
        assert "4. file2.txt" in result
        assert "5. file3.txt" not in result

    @pytest.mark.asyncio
    async def test_list_directory_hides_hidden_files_by_default(
        self,
        built_in_toolset_context,
        temp_workspace,
        directory_with_hidden_and_gitignore,
    ):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".")

        assert "keep.txt" in result
        assert "secret/" not in result
        assert "secret.txt" not in result
        assert ".gitignore" not in result
        assert "ignore.log" not in result
        assert ".hidden.txt" not in result
        assert ".hidden_dir/" not in result

    @pytest.mark.asyncio
    async def test_list_directory_show_all_includes_hidden_and_gitignored(
        self,
        built_in_toolset_context,
        temp_workspace,
        directory_with_hidden_and_gitignore,
    ):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".", show_all=True)

        assert "keep.txt" in result
        assert ".hidden.txt" in result
        assert ".hidden_dir" in result
        assert "ignore.log" in result
        assert "secret" in result
        assert ".gitignore" in result

    @pytest.mark.asyncio
    async def test_list_empty_directory(self, built_in_toolset_context, temp_workspace, empty_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(empty_directory)

        assert "(empty directory)" in result

    @pytest.mark.asyncio
    async def test_list_directory_recursive_unlimited(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".", recursive=True)

        assert "dir1" in result
        assert "  subdir1" in result
        assert "file4.txt" in result

    @pytest.mark.asyncio
    async def test_list_directory_recursive_with_depth_limit(self, built_in_toolset_context, temp_workspace, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".", recursive=True, max_depth=2)

        assert "dir1" in result
        assert "  subdir1/" in result
        assert "file3.txt" in result
        assert "file4.txt" not in result

    @pytest.mark.asyncio
    async def test_list_nonexistent_directory(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(FileNotFoundError):
            await tool.list_directory("nonexistent")

    @pytest.mark.asyncio
    async def test_list_file_as_directory(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(NotADirectoryError):
            await tool.list_directory(filename)

    @pytest.mark.asyncio
    async def test_list_directory_invalid_max_depth(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(ValueError):
            await tool.list_directory(".", recursive=True, max_depth=0)

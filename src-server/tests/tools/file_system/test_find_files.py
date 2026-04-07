import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


@pytest.mark.tool
class TestFindFiles:
    def _fake_scandir_recursive(self, directory, total_entries):
        for index in range(total_entries):
            yield directory / f"file_{index}.txt"

    @pytest.mark.asyncio
    async def test_find_files_basic_matches(self, built_in_toolset_context, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.find_files("*.txt")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file1.txt",
            "file2.txt",
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
            "dir2/file5.txt",
        }

    @pytest.mark.asyncio
    async def test_find_files_limit(self, built_in_toolset_context, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.find_files("*.txt", limit=2)

        assert result["total"] == 2
        assert len(result["matches"]) == 2

    @pytest.mark.asyncio
    async def test_find_files_relative_paths(self, built_in_toolset_context, nested_directory):
        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.find_files("file3.txt")

        assert result["matches"] == ["dir1/file3.txt"]

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "path,expected_error",
        [
            ("nonexistent", FileNotFoundError),
            ("sample.txt", NotADirectoryError),
        ],
        ids=["missing-directory", "path-is-file"],
    )
    async def test_find_files_rejects_invalid_search_roots(
        self,
        built_in_toolset_context,
        sample_text_file,
        path: str,
        expected_error: type[Exception],
    ):
        tool = FileSystemToolset(built_in_toolset_context)

        with pytest.raises(expected_error):
            await tool.find_files("*.txt", path=path)

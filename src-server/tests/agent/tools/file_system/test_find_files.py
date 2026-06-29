import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


@pytest.mark.tool
class TestFindFiles:
    @pytest.mark.asyncio
    async def test_find_files_basic_matches(self, builtin_toolset_context, nested_directory):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/*.txt")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file1.txt",
            "file2.txt",
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
            "dir2/file5.txt",
        }

    @pytest.mark.asyncio
    async def test_find_files_limit(self, builtin_toolset_context, nested_directory):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/*.txt", limit=2)

        assert result["total"] == 2
        assert len(result["matches"]) == 2

    @pytest.mark.asyncio
    async def test_find_files_non_recursive_star(self, builtin_toolset_context, nested_directory):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("*.txt")

        assert result["total"] == 2
        assert set(result["matches"]) == {"file1.txt", "file2.txt"}

    @pytest.mark.asyncio
    async def test_find_files_globstar_recursive(self, builtin_toolset_context, nested_directory):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/*.txt")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file1.txt",
            "file2.txt",
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
            "dir2/file5.txt",
        }

    @pytest.mark.asyncio
    async def test_find_files_relative_paths(self, builtin_toolset_context, nested_directory):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/file3.txt")

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
        builtin_toolset_context,
        sample_text_file,
        path: str,
        expected_error: type[Exception],
    ):
        tool = FileSystemToolset(builtin_toolset_context)

        with pytest.raises(expected_error):
            await tool.find_files("*.txt", path=path)

    @pytest.mark.asyncio
    async def test_find_files_brace_expansion(
        self, builtin_toolset_context, directory_with_mixed_extensions
    ):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/*.{md,mdx}")

        assert result["total"] == 5
        assert set(result["matches"]) == {
            "file2.md",
            "file3.mdx",
            "dir1/file5.md",
            "dir1/subdir1/file6.mdx",
            "dir2/file8.md",
        }

    @pytest.mark.asyncio
    async def test_find_files_brace_expansion_with_path_prefix(
        self, builtin_toolset_context, directory_with_mixed_extensions
    ):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("dir1/**/*.{md,mdx}")

        assert result["total"] == 2
        assert set(result["matches"]) == {
            "dir1/file5.md",
            "dir1/subdir1/file6.mdx",
        }

    @pytest.mark.asyncio
    async def test_find_files_brace_expansion_single(
        self, builtin_toolset_context, directory_with_mixed_extensions
    ):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("*.{txt,md}")

        assert result["total"] == 2
        assert set(result["matches"]) == {"file1.txt", "file2.md"}

    @pytest.mark.asyncio
    async def test_find_files_globstar_with_path_prefix(
        self, builtin_toolset_context, nested_directory
    ):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("dir1/**/*.txt")

        assert result["total"] == 2
        assert set(result["matches"]) == {
            "dir1/file3.txt",
            "dir1/subdir1/file4.txt",
        }

    @pytest.mark.asyncio
    async def test_find_files_brace_expansion_no_match(
        self, builtin_toolset_context, directory_with_mixed_extensions
    ):
        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.find_files("**/*.{py,js}")

        assert result["total"] == 0
        assert result["matches"] == []

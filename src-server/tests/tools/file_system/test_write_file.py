import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


@pytest.mark.tool
class TestWriteFile:
    @pytest.mark.asyncio
    async def test_write_new_file(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        content = "Hello World!\nThis is a test file."

        result = await tool.write_file("new_file.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "new_file.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    @pytest.mark.asyncio
    async def test_write_file_with_unicode_content(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        content = "你好世界！\nこんにちは\n🎉🎊"

        result = await tool.write_file("unicode.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "unicode.txt"
        assert file_path.read_text(encoding="utf-8") == content

    @pytest.mark.asyncio
    async def test_write_file_creates_parent_directories(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        content = "Nested file content"

        result = await tool.write_file("parent/child/nested.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "parent" / "child" / "nested.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    @pytest.mark.asyncio
    async def test_write_empty_file(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)

        result = await tool.write_file("empty_new.txt", "")

        assert result == "File written successfully."
        file_path = temp_workspace / "empty_new.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == ""

    @pytest.mark.asyncio
    async def test_write_large_file(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        content = "A" * (1024 * 1024)

        result = await tool.write_file("large_file.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "large_file.txt"
        assert file_path.exists()
        assert len(file_path.read_text(encoding="utf-8")) == len(content)

    @pytest.mark.asyncio
    async def test_write_file_with_special_characters_in_name(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        content = "Content with special filename"

        result = await tool.write_file("file with spaces.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "file with spaces.txt"
        assert file_path.exists()

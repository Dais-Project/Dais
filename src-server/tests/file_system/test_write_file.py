import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


class TestWriteFile:
    def test_write_new_file(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        content = "Hello World!\nThis is a test file."

        result = tool.write_file("new_file.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "new_file.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_with_unicode_content(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        content = "你好世界！\nこんにちは\n🎉🎊"

        result = tool.write_file("unicode.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "unicode.txt"
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_creates_parent_directories(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        content = "Nested file content"

        result = tool.write_file("parent/child/nested.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "parent" / "child" / "nested.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_overwrite_read_file(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))

        tool.read_file(filename)

        new_content = "New content after overwrite"
        result = tool.write_file(filename, new_content)

        assert result == "File written successfully."
        file_path = temp_workspace / filename
        assert file_path.read_text(encoding="utf-8") == new_content

    def test_write_file_overwrite_unread_file_raises_error(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))

        with pytest.raises(PermissionError) as exc_info:
            tool.write_file(filename, "Trying to overwrite")

        assert "File already exists and was not read before" in str(exc_info.value)
        assert filename in str(exc_info.value)

    def test_write_empty_file(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))

        result = tool.write_file("empty_new.txt", "")

        assert result == "File written successfully."
        file_path = temp_workspace / "empty_new.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == ""

    def test_write_large_file(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        content = "A" * (1024 * 1024)

        result = tool.write_file("large_file.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "large_file.txt"
        assert file_path.exists()
        assert len(file_path.read_text(encoding="utf-8")) == len(content)

    def test_write_file_with_special_characters_in_name(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        content = "Content with special filename"

        result = tool.write_file("file with spaces.txt", content)

        assert result == "File written successfully."
        file_path = temp_workspace / "file with spaces.txt"
        assert file_path.exists()

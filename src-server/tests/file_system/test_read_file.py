import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


class TestReadFile:
    def test_read_text_file_without_line_numbers(self, temp_workspace, sample_text_file):
        filename, expected_content = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file(filename, enable_line_numbers=False)
        assert result == expected_content

    def test_read_text_file_with_line_numbers(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file(filename, enable_line_numbers=True)

        lines = result.split("\n")
        assert len(lines) == 4
        assert "   1 | Line 1" in result
        assert "   2 | Line 2" in result
        assert "   3 | Line 3" in result
        assert "   4 | Special chars: !@#$%" in result

    def test_read_binary_file_with_mock(self, temp_workspace, mocker):
        pdf_path = temp_workspace / "test.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        mock_result = mocker.MagicMock()
        mock_result.markdown = "# Test PDF\nThis is converted markdown content."
        mock_md = mocker.MagicMock()
        mock_md.convert.return_value = mock_result

        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        tool._md = mock_md

        result = tool.read_file("test.pdf")
        assert "Test PDF" in result
        assert "converted markdown" in result
        mock_md.convert.assert_called_once()

    def test_read_nonexistent_file(self, temp_workspace):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        with pytest.raises(FileNotFoundError) as exc_info:
            tool.read_file("nonexistent.txt")
        assert "File not found at nonexistent.txt" in str(exc_info.value)

    def test_read_empty_file(self, temp_workspace, empty_file):
        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file(empty_file)
        assert result == ""

    def test_read_file_with_relative_path(self, temp_workspace):
        subdir = temp_workspace / "subdir"
        subdir.mkdir()
        file_path = subdir / "test.txt"
        file_path.write_text("Test content", encoding="utf-8")

        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file("subdir/test.txt")
        assert result == "Test content"

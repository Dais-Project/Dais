import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestEditFile:
    def test_edit_file_single_line(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        result = tool.edit_file(filename, "Second line", "Modified second line")

        assert "---" in result
        assert "+++" in result
        assert "@@" in result
        assert "-Second line" in result
        assert "+Modified second line" in result

        file_path = Path(temp_workspace) / filename
        new_content = file_path.read_text(encoding="utf-8")
        assert "Modified second line" in new_content
        assert "Second line" not in new_content

    def test_edit_file_multiple_lines(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        old_content = "Second line\nThird line"
        new_content = "New second line\nNew third line"
        result = tool.edit_file(filename, old_content, new_content)

        assert "---" in result
        assert "+++" in result

        file_path = Path(temp_workspace) / filename
        final_content = file_path.read_text(encoding="utf-8")
        assert "New second line" in final_content
        assert "New third line" in final_content

    def test_edit_file_returns_valid_diff(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        result = tool.edit_file(filename, "Original content", "Updated content")

        lines = result.split("\n")
        assert any(line.startswith("---") for line in lines)
        assert any(line.startswith("+++") for line in lines)
        assert any(line.startswith("@@") for line in lines)

    def test_edit_file_with_unicode(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "unicode_edit.txt"
        original = "原始内容\n第二行"

        file_path = Path(temp_workspace) / filename
        file_path.write_text(original, encoding="utf-8")

        result = tool.edit_file(filename, "原始内容", "修改后的内容")

        new_content = file_path.read_text(encoding="utf-8")
        assert "修改后的内容" in new_content
        assert "原始内容" not in new_content

    def test_edit_nonexistent_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.edit_file("nonexistent.txt", "old", "new")

        assert "File not found at nonexistent.txt" in str(exc_info.value)

    def test_edit_file_content_not_found(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(ValueError) as exc_info:
            tool.edit_file(filename, "This content does not exist", "new content")

        assert "Content not found in file" in str(exc_info.value)

    def test_edit_file_content_found_multiple_times(self, temp_workspace, file_with_duplicate_content):
        filename, _ = file_with_duplicate_content
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(ValueError) as exc_info:
            tool.edit_file(filename, "Duplicate line", "new content")

        assert "Content found multiple times in file" in str(exc_info.value)

    def test_edit_file_with_whitespace_sensitivity(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "whitespace.txt"
        content = "Line with spaces\n  Indented line\nNormal line"

        file_path = Path(temp_workspace) / filename
        file_path.write_text(content, encoding="utf-8")

        with pytest.raises(ValueError):
            tool.edit_file(filename, "Line with  spaces", "Modified")

        result = tool.edit_file(filename, "Line with spaces", "Modified line")
        assert "Modified line" in file_path.read_text(encoding="utf-8")

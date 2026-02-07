import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestFileSystemToolInit:
    def test_init_with_absolute_path(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        assert tool.cwd == temp_workspace
        assert hasattr(tool, "md")

    def test_init_with_tilde(self):
        tool = FileSystemToolset("~")
        assert tool.cwd == str(Path.home())

    def test_markitdown_instance(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        assert tool.md is not None


class TestIsMarkitdownConvertableBinary:
    @pytest.mark.parametrize(
        "filename,expected",
        [
            ("test.pdf", True),
            ("test.docx", True),
            ("test.pptx", True),
            ("test.xlsx", True),
            ("test.epub", True),
            ("test.PDF", True),
            ("test.DOCX", True),
            ("test.txt", False),
            ("test.py", False),
            ("test.json", False),
            ("test.md", False),
        ],
    )
    def test_format_detection(self, temp_workspace, filename, expected):
        tool = FileSystemToolset(temp_workspace)
        assert tool._is_markitdown_convertable_binary(filename) == expected

import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


class TestFileSystemToolInit:
    def test_init_with_absolute_path(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        assert tool._ctx.cwd == temp_workspace
        assert hasattr(tool, "_markdown_converter")

    def test_init_with_tilde(self):
        tool = FileSystemToolset(BuiltInToolsetContext(1, "~", ContextUsage.default()))
        assert tool._ctx.cwd == Path.home()

    def test_markitdown_instance(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        assert tool._markdown_converter is not None


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
    def test_format_detection(self, built_in_toolset_context, temp_workspace, filename, expected):
        tool = FileSystemToolset(built_in_toolset_context)
        assert tool._is_markitdown_convertable_binary(filename) == expected

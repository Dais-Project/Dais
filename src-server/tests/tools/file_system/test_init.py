import pytest
from pathlib import Path
from unittest.mock import AsyncMock

from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


CONVERTABLE_EXTENSIONS = ["pdf", "docx", "pptx", "xlsx", "epub"]
NON_CONVERTABLE_EXTENSIONS = ["txt", "py", "json", "md"]


class TestFileSystemToolInit:
    @pytest.mark.asyncio
    async def test_read_file_resolves_absolute_cwd(self, built_in_toolset_context, temp_workspace):
        (temp_workspace / "hello.txt").write_text("hello", encoding="utf-8")
        tool = FileSystemToolset(built_in_toolset_context)

        result = await tool.read_file("hello.txt")

        assert "hello" in result

    @pytest.mark.asyncio
    async def test_read_file_resolves_tilde_cwd(self):
        home = Path.home()
        marker = home / "__dais_test_marker__.txt"
        marker.write_text("tilde-ok", encoding="utf-8")
        try:
            tool = FileSystemToolset(BuiltInToolsetContext(1, "~", ContextUsage.default()))
            result = await tool.read_file("__dais_test_marker__.txt")
            assert "tilde-ok" in result
        finally:
            marker.unlink(missing_ok=True)


class TestMarkitdownConvertableBinaryDetection:
    @pytest.mark.parametrize("ext", CONVERTABLE_EXTENSIONS)
    @pytest.mark.asyncio
    async def test_convertable_file_invokes_converter(self, built_in_toolset_context, temp_workspace, ext):
        filename = f"test.{ext}"
        (temp_workspace / filename).write_bytes(b"fake binary content")

        tool = FileSystemToolset(built_in_toolset_context)
        tool._markdown_converter.convert = AsyncMock(return_value="# converted")

        await tool.read_file(filename)

        tool._markdown_converter.convert.assert_awaited_once()

    @pytest.mark.parametrize("ext", NON_CONVERTABLE_EXTENSIONS)
    @pytest.mark.asyncio
    async def test_non_convertable_file_does_not_invoke_converter(
        self, built_in_toolset_context, temp_workspace, ext
    ):
        filename = f"test.{ext}"
        (temp_workspace / filename).write_text("plain text", encoding="utf-8")

        tool = FileSystemToolset(built_in_toolset_context)
        tool._markdown_converter.convert = AsyncMock(return_value="should not be called")

        await tool.read_file(filename)

        tool._markdown_converter.convert.assert_not_awaited()

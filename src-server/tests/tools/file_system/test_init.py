import pytest
from pathlib import Path
from unittest.mock import AsyncMock

import src.agent.tool.builtin_tools.file_system as file_system_module
from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


CONVERTABLE_EXTENSIONS = ["pdf", "docx", "pptx", "xlsx", "epub"]
NON_CONVERTABLE_EXTENSIONS = ["txt", "py", "json", "md"]


@pytest.mark.tool
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


@pytest.mark.tool
class TestMarkitdownConvertableBinaryDetection:
    @pytest.fixture(autouse=True)
    def mock_markdown_cache(self, monkeypatch: pytest.MonkeyPatch):
        class FakeMarkdownCacheService:
            def __init__(self, db_session, workspace_id: int, cwd: Path):
                self._cwd = cwd

            async def get(self, path: Path) -> str | None:
                return None

            async def set(self, path: Path, content: str) -> None:
                return None

        monkeypatch.setattr(file_system_module, "MarkdownCacheService", FakeMarkdownCacheService)

    @pytest.mark.parametrize("ext", CONVERTABLE_EXTENSIONS)
    @pytest.mark.asyncio
    async def test_convertable_file_invokes_converter(
        self,
        built_in_toolset_context,
        temp_workspace,
        ext,
        monkeypatch: pytest.MonkeyPatch,
    ):
        filename = f"test.{ext}"
        (temp_workspace / filename).write_bytes(b"fake binary content")

        class FakeDbContext:
            async def __aenter__(self):
                return object()

            async def __aexit__(self, exc_type, exc, tb):
                return None

        monkeypatch.setattr(file_system_module, "db_context", lambda: FakeDbContext())

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

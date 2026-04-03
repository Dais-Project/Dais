import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
import src.agent.tool.builtin_tools.utils.markdown as markdown_module
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


def parse_file_content_xml(result: str) -> tuple[ET.Element, str]:
    root = ET.fromstring(result)
    text = root.text or ""
    return root, text


class TestReadFile:
    @pytest.mark.asyncio
    async def test_read_text_file_default(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, expected_content = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        result = await tool.read_file(filename)
        root, text = parse_file_content_xml(result)

        assert root.tag == "file_content"
        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 4
        assert int(root.attrib["total_lines"]) == 4
        assert text == expected_content

    @pytest.mark.asyncio
    async def test_read_text_file_with_offset_and_max_lines(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        result = await tool.read_file(filename, offset=2, max_lines=2)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 2
        assert int(root.attrib["end_line"]) == 3
        assert int(root.attrib["total_lines"]) == 4
        assert text == "Line 2\nLine 3"

    @pytest.mark.asyncio
    async def test_read_markitdown_convertable_file(self, built_in_toolset_context, temp_workspace):
        pdf_path = temp_workspace / "test.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        tool = FileSystemToolset(built_in_toolset_context)
        tool._markdown_converter.convert = AsyncMock(return_value="# Test PDF\nThis is converted markdown content.")

        result = await tool.read_file("test.pdf")
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 2
        assert int(root.attrib["total_lines"]) == 2
        assert "Test PDF" in text
        assert "converted markdown" in text
        tool._markdown_converter.convert.assert_awaited_once_with(pdf_path)

    @pytest.mark.asyncio
    async def test_read_markitdown_convertable_file_uses_cached_conversion(
        self,
        built_in_toolset_context,
        temp_workspace,
        monkeypatch: pytest.MonkeyPatch,
    ):
        pdf_path = temp_workspace / "cached.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        cache_store: dict[str, str] = {}
        convert_result = type("ConvertResult", (), {"markdown": "# Cached PDF\nConverted once"})()
        convert_mock = Mock(return_value=convert_result)

        @asynccontextmanager
        async def fake_db_context():
            yield object()

        class FakeMarkdownCacheService:
            def __init__(self, db_session, workspace_id: int, cwd: Path):
                self._cwd = cwd

            async def get(self, path: Path) -> str | None:
                return cache_store.get(path.relative_to(self._cwd).as_posix())

            async def set(self, path: Path, content: str) -> None:
                cache_store[path.relative_to(self._cwd).as_posix()] = content

        monkeypatch.setattr(markdown_module, "db_context", fake_db_context)
        monkeypatch.setattr(markdown_module, "MarkdownCacheService", FakeMarkdownCacheService)

        tool = FileSystemToolset(built_in_toolset_context)
        monkeypatch.setattr(tool._markdown_converter._md, "convert", convert_mock)

        first_result = await tool.read_file("cached.pdf")
        second_result = await tool.read_file("cached.pdf")

        first_root, first_text = parse_file_content_xml(first_result)
        second_root, second_text = parse_file_content_xml(second_result)

        assert first_text == "# Cached PDF\nConverted once"
        assert second_text == first_text
        assert first_root.attrib["total_lines"] == "2"
        assert second_root.attrib["total_lines"] == "2"
        assert convert_mock.call_count == 1
        assert cache_store == {"cached.pdf": "# Cached PDF\nConverted once"}

    @pytest.mark.asyncio
    async def test_read_nonexistent_file(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(FileNotFoundError) as exc_info:
            await tool.read_file("nonexistent.txt")
        assert "File not found at nonexistent.txt" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_read_empty_file(self, built_in_toolset_context, temp_workspace, empty_file):
        tool = FileSystemToolset(built_in_toolset_context)

        result = await tool.read_file(empty_file)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 0
        assert int(root.attrib["total_lines"]) == 0
        assert text == ""

    @pytest.mark.asyncio
    async def test_read_binary_file(self, built_in_toolset_context, temp_workspace, mocker):
        file_path = temp_workspace / "binary.bin"
        file_path.write_bytes(b"\x00\x01\x02")
        mocker.patch("src.agent.tool.builtin_tools.file_system.is_binary", return_value=True)

        tool = FileSystemToolset(built_in_toolset_context)

        with pytest.raises(ValueError) as exc_info:
            await tool.read_file("binary.bin")
        assert "is a binary file" in str(exc_info.value)

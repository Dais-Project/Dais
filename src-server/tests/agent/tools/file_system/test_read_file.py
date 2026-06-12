import base64
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
import src.agent.tool.builtin_tools.file_system as file_system_module
from dais_sdk.types import AudioBlock, ImageBlock, VideoBlock
from src.agent.tool.builtin_tools.file_system import FileSystemToolset, MAX_MEDIA_CONTENT_BLOCK_BYTES


def parse_file_content_xml(result: ET.Element) -> tuple[ET.Element, str]:
    root = result
    text = root.text or ""
    return root, text


@pytest.mark.tool
class TestReadFile:
    @pytest.mark.asyncio
    async def test_read_text_file_default(self, builtin_toolset_context, temp_workspace, sample_text_file):
        filename, expected_content = sample_text_file
        tool = FileSystemToolset(builtin_toolset_context)

        result = await tool.read_file(filename)
        root, text = parse_file_content_xml(result)

        assert root.tag == "file_content"
        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 4
        assert int(root.attrib["total_lines"]) == 4
        assert text == expected_content

    @pytest.mark.asyncio
    async def test_read_text_file_with_offset_and_max_lines(self, builtin_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(builtin_toolset_context)

        result = await tool.read_file(filename, offset=2, max_lines=2)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 2
        assert int(root.attrib["end_line"]) == 3
        assert int(root.attrib["total_lines"]) == 4
        assert text == "Line 2\nLine 3"

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("filename", "content", "detected_group", "detected_mime_type", "expected_block_type"),
        [
            ("image.png", b"fake image", "image", "image/png", ImageBlock),
            ("audio.mp3", b"fake audio", "audio", "audio/mpeg", AudioBlock),
            ("video.mp4", b"fake video", "video", "video/mp4", VideoBlock),
        ],
    )
    async def test_read_media_file_returns_content_block(
        self,
        builtin_toolset_context,
        temp_workspace,
        monkeypatch: pytest.MonkeyPatch,
        filename: str,
        content: bytes,
        detected_group: str,
        detected_mime_type: str,
        expected_block_type: type[ImageBlock | AudioBlock | VideoBlock],
    ):
        class FakeOutput:
            group = detected_group
            mime_type = detected_mime_type

        async def fake_magika_identify_path(path: Path) -> FakeOutput:
            return FakeOutput()

        monkeypatch.setattr(file_system_module, "magika_identify_path", fake_magika_identify_path)

        (temp_workspace / filename).write_bytes(content)
        tool = FileSystemToolset(builtin_toolset_context)

        result = await tool.read_file(filename)

        assert isinstance(result, list)
        assert len(result) == 1
        block = result[0]
        assert isinstance(block, expected_block_type)
        assert block.source.type == "base64"
        assert block.source.mime_type == detected_mime_type
        assert block.source.data == base64.b64encode(content).decode("ascii")

    @pytest.mark.asyncio
    async def test_read_file_does_not_treat_spoofed_media_extension_as_content_block(
        self,
        builtin_toolset_context,
        temp_workspace,
    ):
        (temp_workspace / "spoofed.png").write_text("plain text", encoding="utf-8")
        tool = FileSystemToolset(builtin_toolset_context)

        with pytest.raises(ValueError, match="is a binary file"):
            await tool.read_file("spoofed.png")

    @pytest.mark.asyncio
    async def test_read_media_file_rejects_oversized_content_block(
        self,
        builtin_toolset_context,
        temp_workspace,
        monkeypatch: pytest.MonkeyPatch,
    ):
        class FakeOutput:
            group = "image"
            mime_type = "image/png"

        async def fake_magika_identify_path(path: Path) -> FakeOutput:
            return FakeOutput()

        monkeypatch.setattr(file_system_module, "magika_identify_path", fake_magika_identify_path)

        file_path = temp_workspace / "large.png"
        with file_path.open("wb") as f:
            f.truncate(MAX_MEDIA_CONTENT_BLOCK_BYTES + 1)
        tool = FileSystemToolset(builtin_toolset_context)

        with pytest.raises(ValueError, match="too large to return as a ContentBlock"):
            await tool.read_file("large.png")

    @pytest.mark.asyncio
    async def test_read_markitdown_convertable_file(self, builtin_toolset_context, temp_workspace, monkeypatch: pytest.MonkeyPatch):
        pdf_path = temp_workspace / "test.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        async def fake_convert(self, path: Path) -> str:
            assert path == pdf_path
            return "# Test PDF\nThis is converted markdown content."

        @asynccontextmanager
        async def fake_db_context():
            yield object()

        class FakeMarkdownCacheService:
            def __init__(self, db_session, workspace_id: int, cwd: Path):
                self._cwd = cwd

            async def get(self, path: Path) -> str | None:
                return None

            async def set(self, path: Path, content: str) -> None:
                return None

        monkeypatch.setattr(file_system_module, "db_context", fake_db_context)
        monkeypatch.setattr(file_system_module, "MarkdownCacheService", FakeMarkdownCacheService)

        tool = FileSystemToolset(builtin_toolset_context)
        monkeypatch.setattr(tool._markdown_converter, "convert", fake_convert.__get__(tool._markdown_converter, type(tool._markdown_converter)))
        result = await tool.read_file("test.pdf")
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 2
        assert int(root.attrib["total_lines"]) == 2
        assert "Test PDF" in text
        assert "converted markdown" in text

    @pytest.mark.asyncio
    async def test_read_markitdown_convertable_file_uses_cached_conversion(
        self,
        builtin_toolset_context,
        temp_workspace,
        monkeypatch: pytest.MonkeyPatch,
    ):
        pdf_path = temp_workspace / "cached.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        cache_store: dict[str, str] = {}

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

        class FakeConvertResult:
            markdown = "# Cached PDF\nConverted once"

        async def fake_convert(self, source: Path) -> str:
            assert source == pdf_path
            return FakeConvertResult.markdown

        monkeypatch.setattr(file_system_module, "db_context", fake_db_context)
        monkeypatch.setattr(file_system_module, "MarkdownCacheService", FakeMarkdownCacheService)

        tool = FileSystemToolset(builtin_toolset_context)
        monkeypatch.setattr(tool._markdown_converter, "convert", fake_convert.__get__(tool._markdown_converter, type(tool._markdown_converter)))

        first_result = await tool.read_file("cached.pdf")
        second_result = await tool.read_file("cached.pdf")

        first_root, first_text = parse_file_content_xml(first_result)
        second_root, second_text = parse_file_content_xml(second_result)

        assert first_text == "# Cached PDF\nConverted once"
        assert second_text == first_text
        assert first_root.attrib["total_lines"] == "2"
        assert second_root.attrib["total_lines"] == "2"
        assert cache_store == {"cached.pdf": "# Cached PDF\nConverted once"}

    @pytest.mark.asyncio
    async def test_read_nonexistent_file(self, builtin_toolset_context, temp_workspace):
        tool = FileSystemToolset(builtin_toolset_context)
        with pytest.raises(FileNotFoundError) as exc_info:
            await tool.read_file("nonexistent.txt")
        assert "File not found at nonexistent.txt" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_read_empty_file(self, builtin_toolset_context, temp_workspace, empty_file):
        tool = FileSystemToolset(builtin_toolset_context)

        result = await tool.read_file(empty_file)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 0
        assert int(root.attrib["total_lines"]) == 0
        assert text == ""

    @pytest.mark.asyncio
    async def test_read_binary_file(self, builtin_toolset_context, temp_workspace, mocker):
        file_path = temp_workspace / "binary.bin"
        file_path.write_bytes(b"\x00\x01\x02")
        mocker.patch("src.agent.tool.builtin_tools.file_system.is_binary", return_value=True)

        tool = FileSystemToolset(builtin_toolset_context)

        with pytest.raises(ValueError) as exc_info:
            await tool.read_file("binary.bin")
        assert "is a binary file" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_read_file_xml_special_chars_should_not_be_escaped(self, builtin_toolset_context, temp_workspace):
        """Read a file containing XML special characters and verify the output does
        NOT escape them.  This is a regression test for a known bug: ET.Element
        serialization currently escapes <, >, & into &lt;, &gt;, &amp; when the
        framework calls ET.tostring() on the result.  The desired behaviour is that
        the raw XML output preserves the literal characters (e.g. for LLM consumption).
        """
        content = "<div>test</div>\na & b\n"
        file_path = temp_workspace / "xml_special_chars.txt"
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.read_file("xml_special_chars.txt")

        raw_xml = ET.tostring(result, encoding="unicode")
        assert "<div>test</div>" in raw_xml, (
            "BUG: read_file output should contain literal '<' and '>' but "
            "ET.tostring() escapes them to &lt; and &gt;"
        )
        assert "a & b" in raw_xml, (
            "BUG: read_file output should contain literal '&' but "
            "ET.tostring() escapes it to &amp;"
        )
        assert "&lt;" not in raw_xml
        assert "&gt;" not in raw_xml
        assert "&amp;" not in raw_xml

        # Regardless of the serialization bug, the parsed ET.Element must still
        # faithfully represent the file content.
        root, text = parse_file_content_xml(result)
        assert text == content

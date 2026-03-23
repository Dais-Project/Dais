import xml.etree.ElementTree as ET

import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


def parse_file_content_xml(result: str) -> tuple[ET.Element, str]:
    root = ET.fromstring(result)
    text = root.text or ""
    return root, text


class TestReadFile:
    def test_read_text_file_default(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, expected_content = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.read_file(filename)
        root, text = parse_file_content_xml(result)

        assert root.tag == "file_content"
        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 4
        assert int(root.attrib["total_lines"]) == 4
        assert text == expected_content

    def test_read_text_file_with_offset_and_max_lines(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.read_file(filename, offset=2, max_lines=2)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 2
        assert int(root.attrib["end_line"]) == 3
        assert int(root.attrib["total_lines"]) == 4
        assert text == "Line 2\nLine 3"

    def test_read_markitdown_convertable_file(self, built_in_toolset_context, temp_workspace, mocker):
        pdf_path = temp_workspace / "test.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        mock_result = mocker.MagicMock()
        mock_result.markdown = "# Test PDF\nThis is converted markdown content."
        mock_md = mocker.MagicMock()
        mock_md.convert.return_value = mock_result

        tool = FileSystemToolset(built_in_toolset_context)
        tool._md = mock_md

        result = tool.read_file("test.pdf")
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 2
        assert int(root.attrib["total_lines"]) == 2
        assert "Test PDF" in text
        assert "converted markdown" in text
        mock_md.convert.assert_called_once()

    def test_read_nonexistent_file(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        with pytest.raises(FileNotFoundError) as exc_info:
            tool.read_file("nonexistent.txt")
        assert "File not found at nonexistent.txt" in str(exc_info.value)

    def test_read_empty_file(self, built_in_toolset_context, temp_workspace, empty_file):
        tool = FileSystemToolset(built_in_toolset_context)

        result = tool.read_file(empty_file)
        root, text = parse_file_content_xml(result)

        assert int(root.attrib["start_line"]) == 1
        assert int(root.attrib["end_line"]) == 0
        assert int(root.attrib["total_lines"]) == 0
        assert text == ""

    def test_read_binary_file(self, built_in_toolset_context, temp_workspace, mocker):
        file_path = temp_workspace / "binary.bin"
        file_path.write_bytes(b"\x00\x01\x02")
        mocker.patch("src.agent.tool.builtin_tools.file_system.is_binary", return_value=True)

        tool = FileSystemToolset(built_in_toolset_context)

        with pytest.raises(ValueError) as exc_info:
            tool.read_file("binary.bin")
        assert "is a binary file" in str(exc_info.value)

import xml.etree.ElementTree as ET

import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


def parse_file_content_xml(result: str) -> tuple[ET.Element, str]:
    root = ET.fromstring(result)
    text = root.text or ""
    return root, text


@pytest.mark.tool
class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_unicode_filename(self, built_in_toolset_context, temp_workspace):
        filename = "测试文件.txt"
        file_path = temp_workspace / filename
        content = "Unicode content: 你好世界"
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.read_file(filename)
        _, text = parse_file_content_xml(result)
        assert text == content

    @pytest.mark.asyncio
    async def test_special_characters_in_content(self, built_in_toolset_context, temp_workspace):
        filename = "special.txt"
        content = "Special chars: <>&\"'\n\t"
        file_path = temp_workspace / filename
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.read_file(filename)
        _, text = parse_file_content_xml(result)
        assert "<>&\"'" in text

    @pytest.mark.asyncio
    async def test_list_directory_sorting(self, built_in_toolset_context, temp_workspace):
        base = temp_workspace

        (base / "zebra.txt").write_text("", encoding="utf-8")
        (base / "apple.txt").write_text("", encoding="utf-8")
        (base / "zoo_dir").mkdir()
        (base / "alpha_dir").mkdir()

        tool = FileSystemToolset(built_in_toolset_context)
        result = await tool.list_directory(".")

        lines = result.split("\n")[1:]
        dir_lines = [line for line in lines if line.endswith("/")]
        file_lines = [line for line in lines if not line.endswith("/")]

        assert len(dir_lines) == 2
        assert len(file_lines) == 2
        assert "alpha_dir" in dir_lines[0]
        assert "zoo_dir" in dir_lines[1]
        assert "apple.txt" in file_lines[0]
        assert "zebra.txt" in file_lines[1]

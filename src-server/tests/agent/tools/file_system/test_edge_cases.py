import re

import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


def _extract_file_content_text(result: str) -> str:
    close_tag = "</file_content>"
    close_pos = result.rindex(close_tag)
    tag_end = result.index(">")
    content = result[tag_end + 1:close_pos]
    if content.startswith("\n"):
        content = content[1:]
    if content.endswith("\n"):
        content = content[:-1]
    return content


@pytest.mark.tool
class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_unicode_filename(self, builtin_toolset_context, temp_workspace):
        filename = "测试文件.txt"
        file_path = temp_workspace / filename
        content = "Unicode content: 你好世界"
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.read_file(filename)
        text = _extract_file_content_text(result)
        assert text == content

    @pytest.mark.asyncio
    async def test_special_characters_in_content(self, builtin_toolset_context, temp_workspace):
        filename = "special.txt"
        content = "Special chars: <>&\"'\n\t"
        file_path = temp_workspace / filename
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.read_file(filename)
        text = _extract_file_content_text(result)
        assert "<>&\"'" in text

    @pytest.mark.asyncio
    async def test_list_directory_sorting(self, builtin_toolset_context, temp_workspace):
        base = temp_workspace

        (base / "zebra.txt").write_text("", encoding="utf-8")
        (base / "apple.txt").write_text("", encoding="utf-8")
        (base / "zoo_dir").mkdir()
        (base / "alpha_dir").mkdir()

        tool = FileSystemToolset(builtin_toolset_context)
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

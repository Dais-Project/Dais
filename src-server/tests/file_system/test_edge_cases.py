from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.agent.types import ContextUsage


class TestEdgeCases:
    def test_unicode_filename(self, temp_workspace):
        filename = "测试文件.txt"
        file_path = temp_workspace / filename
        content = "Unicode content: 你好世界"
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file(filename)
        assert result == content

    def test_special_characters_in_content(self, temp_workspace):
        filename = "special.txt"
        content = "Special chars: <>&\"'\n\t"
        file_path = temp_workspace / filename
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.read_file(filename)
        assert "<>&\"'" in result

    def test_list_directory_sorting(self, temp_workspace):
        base = temp_workspace

        (base / "zebra.txt").write_text("", encoding="utf-8")
        (base / "apple.txt").write_text("", encoding="utf-8")
        (base / "zoo_dir").mkdir()
        (base / "alpha_dir").mkdir()

        tool = FileSystemToolset(BuiltInToolsetContext(temp_workspace, ContextUsage()))
        result = tool.list_directory(".")

        lines = result.split("\n")
        dir_lines = [line for line in lines if "[dir]" in line]
        file_lines = [line for line in lines if "[file]" in line]

        assert len(dir_lines) == 2
        assert len(file_lines) == 2
        assert "alpha_dir" in dir_lines[0]
        assert "zoo_dir" in dir_lines[1]
        assert "apple.txt" in file_lines[0]
        assert "zebra.txt" in file_lines[1]

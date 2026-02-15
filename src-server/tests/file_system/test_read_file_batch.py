from src.agent.tool.builtin_tools.file_system import FileSystemToolset
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext


class TestReadFileBatch:
    def test_read_single_file(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext.default())
        result = tool.read_file_batch([filename])

        assert f'<file_content path="{filename}">' in result
        assert content in result
        assert "</file_content>" in result

    def test_read_multiple_files(self, temp_workspace, multiple_files):
        tool = FileSystemToolset(BuiltInToolsetContext.default())
        filenames = list(multiple_files.keys())
        result = tool.read_file_batch(filenames)

        for filename, content in multiple_files.items():
            assert f'<file_content path="{filename}">' in result
            assert content in result

    def test_read_batch_with_nonexistent_file(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(BuiltInToolsetContext.default())
        result = tool.read_file_batch([filename, "nonexistent.txt"])

        assert content in result
        assert "Error:" in result
        assert "nonexistent.txt" in result

    def test_read_batch_with_line_numbers(self, temp_workspace, multiple_files):
        tool = FileSystemToolset(BuiltInToolsetContext.default())
        filenames = list(multiple_files.keys())
        result = tool.read_file_batch(filenames, enable_line_numbers=True)

        assert "   1 |" in result

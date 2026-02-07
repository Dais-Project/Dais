import pytest
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestCopy:
    def test_copy_file_to_new_path(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(filename, "copied_file.txt")

        assert f"Successfully copied '{filename}' to 'copied_file.txt'" in result

        assert (temp_workspace / filename).exists()

        dest_path = temp_workspace / "copied_file.txt"
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_file_into_directory(self, temp_workspace, sample_text_file, empty_directory):
        filename, content = sample_text_file
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(filename, dirname)

        assert "Successfully copied" in result

        dest_path = temp_workspace / dirname / filename
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_file_preserves_content(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "source.txt"
        content = "Line 1\nLine 2\nSpecial chars: !@#$%^&*()\n你好世界"

        source_path = temp_workspace / filename
        source_path.write_text(content, encoding="utf-8")

        tool.copy(filename, "destination.txt")

        dest_path = temp_workspace / "destination.txt"
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_directory_to_new_path(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_dir")

        assert "Successfully copied" in result

        dest_path = temp_workspace / "copied_dir"
        assert dest_path.is_dir()
        assert (dest_path / "file1.txt").exists()
        assert (dest_path / "file2.txt").exists()
        assert (dest_path / "file3.txt").exists()

    def test_copy_directory_into_directory(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        target_dir = temp_workspace / "target"
        target_dir.mkdir()

        result = tool.copy(dirname, "target")

        assert "Successfully copied" in result

        dest_path = target_dir / dirname
        assert dest_path.is_dir()
        assert (dest_path / "file1.txt").exists()

    def test_copy_nested_directory(self, temp_workspace, nested_structure):
        dirname = nested_structure
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_nested")

        assert "Successfully copied" in result

        dest_path = temp_workspace / "copied_nested"
        assert dest_path.is_dir()
        assert (dest_path / "root.txt").exists()
        assert (dest_path / "level1" / "l1.txt").exists()
        assert (dest_path / "level1" / "level2" / "l2.txt").exists()
        assert (dest_path / "level1" / "level2" / "level3" / "l3.txt").exists()

    def test_copy_nonexistent_source(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.copy("nonexistent.txt", "dest.txt")

        assert "'nonexistent.txt' not found" in str(exc_info.value)

    def test_copy_file_to_existing_file(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        dest_path = temp_workspace / "existing.txt"
        dest_path.write_text("existing content", encoding="utf-8")

        with pytest.raises(FileExistsError) as exc_info:
            tool.copy(filename, "existing.txt")

        assert "already exists at destination" in str(exc_info.value)
        assert "Copy aborted to prevent overwrite" in str(exc_info.value)

    def test_copy_directory_to_existing_directory_with_same_name(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        target_dir = temp_workspace / "target"
        target_dir.mkdir()
        (target_dir / dirname).mkdir()

        with pytest.raises(FileExistsError) as exc_info:
            tool.copy(dirname, "target")

        assert "already exists at destination" in str(exc_info.value)

    def test_copy_empty_file(self, temp_workspace, empty_file):
        filename = empty_file
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(filename, "copied_empty.txt")

        assert "Successfully copied" in result
        dest_path = temp_workspace / "copied_empty.txt"
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == ""

    def test_copy_empty_directory(self, temp_workspace, empty_directory):
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_empty_dir")

        assert "Successfully copied" in result
        dest_path = temp_workspace / "copied_empty_dir"
        assert dest_path.is_dir()
        assert len(list(dest_path.iterdir())) == 0

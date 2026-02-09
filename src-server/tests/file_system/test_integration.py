from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestIntegration:
    def test_write_edit_workflow(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "workflow_test.txt"

        initial_content = "Initial content\nSecond line"
        tool.write_file(filename, initial_content)

        result = tool.edit_file(filename, "Initial content", "Modified content")

        assert "---" in result
        file_path = temp_workspace / filename
        final_content = file_path.read_text(encoding="utf-8")
        assert "Modified content" in final_content
        assert "Initial content" not in final_content

    def test_read_write_edit_delete_workflow(self, temp_workspace, sample_text_file):
        filename, original_content = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        read_content = tool.read_file(filename)
        assert original_content in read_content

        new_content = "Completely new content\nNew line 2"
        tool.write_file(filename, new_content)

        tool.edit_file(filename, "Completely new content", "Edited content")

        file_path = temp_workspace / filename
        assert "Edited content" in file_path.read_text(encoding="utf-8")

        result = tool.delete(filename)
        assert "deleted successfully" in result
        assert not file_path.exists()

    def test_read_file_set_consistency_across_operations(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        filename1 = "file1.txt"
        file1_path = temp_workspace / filename1
        file1_path.write_text("Content 1", encoding="utf-8")
        tool.read_file(filename1)

        abs_path1 = str(file1_path)
        assert abs_path1 in tool._read_file_set

        filename2 = "file2.txt"
        tool.write_file(filename2, "Content 2")
        tool.read_file(filename2)

        abs_path2 = str(temp_workspace / filename2)
        assert abs_path2 in tool._read_file_set

        tool.delete(filename1)
        assert abs_path1 not in tool._read_file_set

        assert abs_path2 in tool._read_file_set

        tool.write_file(filename2, "New content")

        file2_path = temp_workspace / filename2
        assert file2_path.read_text(encoding="utf-8") == "New content"

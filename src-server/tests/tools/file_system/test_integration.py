from src.agent.tool.builtin_tools.file_system import FileSystemToolset
import pytest


@pytest.mark.tool
@pytest.mark.integration
class TestIntegration:
    @pytest.mark.asyncio
    async def test_write_edit_workflow(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)
        filename = "workflow_test.txt"

        initial_content = "Initial content\nSecond line"
        await tool.write_file(filename, initial_content)

        result = await tool.edit_file(filename, "Initial content", "Modified content")

        assert "---" in result
        file_path = temp_workspace / filename
        final_content = file_path.read_text(encoding="utf-8")
        assert "Modified content" in final_content
        assert "Initial content" not in final_content

    @pytest.mark.asyncio
    async def test_read_write_edit_delete_workflow(self, built_in_toolset_context, temp_workspace, sample_text_file):
        filename, original_content = sample_text_file
        tool = FileSystemToolset(built_in_toolset_context)

        read_content = await tool.read_file(filename)
        assert original_content in read_content

        new_content = "Completely new content\nNew line 2"
        await tool.write_file(filename, new_content)

        await tool.edit_file(filename, "Completely new content", "Edited content")

        file_path = temp_workspace / filename
        assert "Edited content" in file_path.read_text(encoding="utf-8")

    @pytest.mark.asyncio
    async def test_read_file_set_consistency_across_operations(self, built_in_toolset_context, temp_workspace):
        tool = FileSystemToolset(built_in_toolset_context)

        filename1 = "file1.txt"
        file1_path = temp_workspace / filename1
        file1_path.write_text("Content 1", encoding="utf-8")
        await tool.read_file(filename1)

        filename2 = "file2.txt"
        await tool.write_file(filename2, "Content 2")
        await tool.read_file(filename2)

        await tool.write_file(filename2, "New content")

        file2_path = temp_workspace / filename2
        assert file2_path.read_text(encoding="utf-8") == "New content"

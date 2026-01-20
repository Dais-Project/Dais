import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class TestFileSystemToolInit:
    def test_init_with_absolute_path(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        assert tool.cwd == temp_workspace
        assert hasattr(tool, "md")

    def test_init_with_tilde(self):
        tool = FileSystemToolset("~")
        assert tool.cwd == str(Path.home())

    def test_markitdown_instance(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        assert tool.md is not None


class TestIsMarkitdownConvertableBinary:
    @pytest.mark.parametrize("filename,expected", [
        ("test.pdf", True),
        ("test.docx", True),
        ("test.pptx", True),
        ("test.xlsx", True),
        ("test.epub", True),
        ("test.PDF", True),
        ("test.DOCX", True),
        ("test.txt", False),
        ("test.py", False),
        ("test.json", False),
        ("test.md", False),
    ])
    def test_format_detection(self, temp_workspace, filename, expected):
        tool = FileSystemToolset(temp_workspace)
        assert tool._is_markitdown_convertable_binary(filename) == expected


class TestReadFile:
    def test_read_text_file_without_line_numbers(self, temp_workspace, sample_text_file):
        filename, expected_content = sample_text_file
        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file(filename, enable_line_numbers=False)
        assert result == expected_content

    def test_read_text_file_with_line_numbers(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file(filename, enable_line_numbers=True)

        lines = result.split("\n")
        assert len(lines) == 4
        assert "   1 | Line 1" in result
        assert "   2 | Line 2" in result
        assert "   3 | Line 3" in result
        assert "   4 | Special chars: !@#$%" in result

    def test_read_binary_file_with_mock(self, temp_workspace, mocker):
        # Create a .pdf file (actually an empty file)
        pdf_path = Path(temp_workspace) / "test.pdf"
        pdf_path.write_bytes(b"fake pdf content")

        mock_result = mocker.MagicMock()
        mock_result.markdown = "# Test PDF\nThis is converted markdown content."
        mock_md = mocker.MagicMock()
        mock_md.convert.return_value = mock_result

        tool = FileSystemToolset(temp_workspace)
        tool.md = mock_md

        result = tool.read_file("test.pdf")
        assert "Test PDF" in result
        assert "converted markdown" in result
        mock_md.convert.assert_called_once()

    def test_read_nonexistent_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        with pytest.raises(FileNotFoundError) as exc_info:
            tool.read_file("nonexistent.txt")
        assert "File not found at nonexistent.txt" in str(exc_info.value)

    def test_read_empty_file(self, temp_workspace, empty_file):
        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file(empty_file)
        assert result == ""

    def test_read_file_with_relative_path(self, temp_workspace):
        subdir = Path(temp_workspace) / "subdir"
        subdir.mkdir()
        file_path = subdir / "test.txt"
        file_path.write_text("Test content", encoding="utf-8")

        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file("subdir/test.txt")
        assert result == "Test content"


class TestReadFileBatch:
    def test_read_single_file(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file_batch([filename])

        assert f'<file_content path="{filename}">' in result
        assert content in result
        assert '</file_content>' in result

    def test_read_multiple_files(self, temp_workspace, multiple_files):
        tool = FileSystemToolset(temp_workspace)
        filenames = list(multiple_files.keys())
        result = tool.read_file_batch(filenames)

        for filename, content in multiple_files.items():
            assert f'<file_content path="{filename}">' in result
            assert content in result

    def test_read_batch_with_nonexistent_file(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file_batch([filename, "nonexistent.txt"])

        # Existing file should be read normally
        assert content in result
        # Non-existent file should show error
        assert "Error:" in result
        assert "nonexistent.txt" in result

    def test_read_batch_with_line_numbers(self, temp_workspace, multiple_files):
        tool = FileSystemToolset(temp_workspace)
        filenames = list(multiple_files.keys())
        result = tool.read_file_batch(filenames, enable_line_numbers=True)

        # Check line number format
        assert "   1 |" in result


class TestListDirectory:
    def test_list_directory_non_recursive(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(temp_workspace)
        result = tool.list_directory(".")

        assert "Directory: ." in result
        assert "[dir] dir1" in result
        assert "[dir] dir2" in result
        assert "[file] file1.txt" in result
        assert "[file] file2.txt" in result
        # Should not include files in subdirectories
        assert "file3.txt" not in result

    def test_list_empty_directory(self, temp_workspace, empty_directory):
        tool = FileSystemToolset(temp_workspace)
        result = tool.list_directory(empty_directory)

        assert "(empty directory)" in result

    def test_list_directory_recursive_unlimited(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(temp_workspace)
        result = tool.list_directory(".", recursive=True)

        assert "1 [dir] dir1" in result
        assert "1.1 [dir] subdir1" in result
        assert "file4.txt" in result  # Deep level file

    def test_list_directory_recursive_with_depth_limit(self, temp_workspace, nested_directory):
        tool = FileSystemToolset(temp_workspace)
        result = tool.list_directory(".", recursive=True, max_depth=2)

        # Should include first two levels
        assert "[dir] dir1" in result
        assert "[dir] subdir1" in result
        # Should not include third level content
        assert "file4.txt" not in result

    def test_list_nonexistent_directory(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        with pytest.raises(FileNotFoundError):
            tool.list_directory("nonexistent")

    def test_list_file_as_directory(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)
        with pytest.raises(NotADirectoryError):
            tool.list_directory(filename)

    def test_list_directory_invalid_max_depth(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        with pytest.raises(ValueError):
            tool.list_directory(".", recursive=True, max_depth=0)

    def test_list_directory_with_permission_error(self, temp_workspace, mocker):
        tool = FileSystemToolset(temp_workspace)

        # Use mocker.patch instead of unittest.mock.patch
        mock_iterdir = mocker.patch("pathlib.Path.iterdir")
        mock_iterdir.side_effect = PermissionError()

        result = tool.list_directory(".")
        assert "Error: Permission denied" in result


class TestEdgeCases:
    def test_unicode_filename(self, temp_workspace):
        filename = "测试文件.txt"
        file_path = Path(temp_workspace) / filename
        content = "Unicode content: 你好世界"
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file(filename)
        assert result == content

    def test_special_characters_in_content(self, temp_workspace):
        filename = "special.txt"
        content = "Special chars: <>&\"'\n\t"
        file_path = Path(temp_workspace) / filename
        file_path.write_text(content, encoding="utf-8")

        tool = FileSystemToolset(temp_workspace)
        result = tool.read_file(filename)
        assert "<>&\"'" in result

    def test_list_directory_sorting(self, temp_workspace):
        base = Path(temp_workspace)

        # Create files and directories (intentionally in random order)
        (base / "zebra.txt").write_text("", encoding="utf-8")
        (base / "apple.txt").write_text("", encoding="utf-8")
        (base / "zoo_dir").mkdir()
        (base / "alpha_dir").mkdir()

        tool = FileSystemToolset(temp_workspace)
        result = tool.list_directory(".")

        lines = result.split("\n")
        # Find positions of directories and files
        dir_lines = [line for line in lines if "[dir]" in line]
        file_lines = [line for line in lines if "[file]" in line]

        # Verify directories come before files
        assert len(dir_lines) == 2
        assert len(file_lines) == 2
        assert "alpha_dir" in dir_lines[0]
        assert "zoo_dir" in dir_lines[1]
        assert "apple.txt" in file_lines[0]
        assert "zebra.txt" in file_lines[1]


class TestWriteFile:
    def test_write_new_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        content = "Hello World!\nThis is a test file."

        result = tool.write_file("new_file.txt", content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "new_file.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_with_unicode_content(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        content = "你好世界！\nこんにちは\n🎉🎊"

        result = tool.write_file("unicode.txt", content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "unicode.txt"
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_creates_parent_directories(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        content = "Nested file content"

        result = tool.write_file("parent/child/nested.txt", content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "parent" / "child" / "nested.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == content

    def test_write_file_overwrite_read_file(self, temp_workspace, sample_text_file):
        filename, original_content = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        # Read file first
        tool.read_file(filename)

        # Then overwrite
        new_content = "New content after overwrite"
        result = tool.write_file(filename, new_content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / filename
        assert file_path.read_text(encoding="utf-8") == new_content

    def test_write_file_overwrite_unread_file_raises_error(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        # Try to overwrite without reading
        with pytest.raises(PermissionError) as exc_info:
            tool.write_file(filename, "Trying to overwrite")

        assert "File already exists and was not read before" in str(exc_info.value)
        assert filename in str(exc_info.value)

    def test_write_empty_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        result = tool.write_file("empty_new.txt", "")

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "empty_new.txt"
        assert file_path.exists()
        assert file_path.read_text(encoding="utf-8") == ""

    def test_write_large_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        # Create 1MB content
        content = "A" * (1024 * 1024)

        result = tool.write_file("large_file.txt", content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "large_file.txt"
        assert file_path.exists()
        assert len(file_path.read_text(encoding="utf-8")) == len(content)

    def test_write_file_with_special_characters_in_name(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        content = "Content with special filename"

        result = tool.write_file("file with spaces.txt", content)

        assert result == "File written successfully."
        file_path = Path(temp_workspace) / "file with spaces.txt"
        assert file_path.exists()


class TestEditFile:
    def test_edit_file_single_line(self, temp_workspace, file_with_content):
        filename, original_content = file_with_content
        tool = FileSystemToolset(temp_workspace)

        result = tool.edit_file(filename, "Second line", "Modified second line")

        # Verify valid diff is returned
        assert "---" in result
        assert "+++" in result
        assert "@@" in result
        assert "-Second line" in result
        assert "+Modified second line" in result

        # Verify file content is modified
        file_path = Path(temp_workspace) / filename
        new_content = file_path.read_text(encoding="utf-8")
        assert "Modified second line" in new_content
        assert "Second line" not in new_content
    
    def test_edit_file_multiple_lines(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        old_content = "Second line\nThird line"
        new_content = "New second line\nNew third line"
        result = tool.edit_file(filename, old_content, new_content)

        # Verify diff format
        assert "---" in result
        assert "+++" in result

        # Verify file content
        file_path = Path(temp_workspace) / filename
        final_content = file_path.read_text(encoding="utf-8")
        assert "New second line" in final_content
        assert "New third line" in final_content
    
    def test_edit_file_returns_valid_diff(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        result = tool.edit_file(filename, "Original content", "Updated content")

        # Verify unified diff format markers
        lines = result.split("\n")
        assert any(line.startswith("---") for line in lines)
        assert any(line.startswith("+++") for line in lines)
        assert any(line.startswith("@@") for line in lines)
    
    def test_edit_file_with_unicode(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "unicode_edit.txt"
        original = "原始内容\n第二行"

        # Create file
        file_path = Path(temp_workspace) / filename
        file_path.write_text(original, encoding="utf-8")

        result = tool.edit_file(filename, "原始内容", "修改后的内容")

        # Verify edit successful
        new_content = file_path.read_text(encoding="utf-8")
        assert "修改后的内容" in new_content
        assert "原始内容" not in new_content
    
    def test_edit_nonexistent_file(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.edit_file("nonexistent.txt", "old", "new")

        assert "File not found at nonexistent.txt" in str(exc_info.value)
    
    def test_edit_file_content_not_found(self, temp_workspace, file_with_content):
        filename, _ = file_with_content
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(ValueError) as exc_info:
            tool.edit_file(filename, "This content does not exist", "new content")

        assert "Content not found in file" in str(exc_info.value)
    
    def test_edit_file_content_found_multiple_times(self, temp_workspace, file_with_duplicate_content):
        filename, _ = file_with_duplicate_content
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(ValueError) as exc_info:
            tool.edit_file(filename, "Duplicate line", "new content")

        assert "Content found multiple times in file" in str(exc_info.value)
    
    def test_edit_file_with_whitespace_sensitivity(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "whitespace.txt"
        content = "Line with spaces\n  Indented line\nNormal line"

        file_path = Path(temp_workspace) / filename
        file_path.write_text(content, encoding="utf-8")

        # Whitespace mismatch should fail
        with pytest.raises(ValueError):
            tool.edit_file(filename, "Line with  spaces", "Modified")  # Double space

        # Exact match should succeed
        result = tool.edit_file(filename, "Line with spaces", "Modified line")
        assert "Modified line" in file_path.read_text(encoding="utf-8")


class TestDelete:
    def test_delete_file(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(filename)

        assert f"'{filename}' deleted successfully" in result
        file_path = Path(temp_workspace) / filename
        assert not file_path.exists()

    def test_delete_empty_directory(self, temp_workspace, empty_directory):
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()

    def test_delete_directory_with_contents(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert f"'{dirname}' deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()

    def test_delete_file_removes_from_read_set(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        # Read file (add to read_set)
        tool.read_file(filename)
        abs_path = str(Path(temp_workspace) / filename)
        assert abs_path in tool._read_file_set

        # Delete file
        tool.delete(filename)

        # Verify removed from read_set
        assert abs_path not in tool._read_file_set

    def test_delete_unread_file_does_not_affect_read_set(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "unread.txt"

        # Create file but don't read
        file_path = Path(temp_workspace) / filename
        file_path.write_text("content", encoding="utf-8")

        # Delete file
        result = tool.delete(filename)

        assert "deleted successfully" in result
        assert not file_path.exists()

    def test_delete_nonexistent_path(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        with pytest.raises(FileNotFoundError) as exc_info:
            tool.delete("nonexistent_path")

        assert "'nonexistent_path' not found" in str(exc_info.value)

    def test_delete_nested_directory(self, temp_workspace, nested_structure):
        dirname = nested_structure
        tool = FileSystemToolset(temp_workspace)

        result = tool.delete(dirname)

        assert "deleted successfully" in result
        dir_path = Path(temp_workspace) / dirname
        assert not dir_path.exists()


class TestCopy:
    def test_copy_file_to_new_path(self, temp_workspace, sample_text_file):
        filename, content = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(filename, "copied_file.txt")

        assert f"Successfully copied '{filename}' to 'copied_file.txt'" in result

        # Verify source file still exists
        assert (Path(temp_workspace) / filename).exists()

        # Verify destination file created with same content
        dest_path = Path(temp_workspace) / "copied_file.txt"
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_file_into_directory(self, temp_workspace, sample_text_file, empty_directory):
        filename, content = sample_text_file
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(filename, dirname)

        assert "Successfully copied" in result

        # Verify file copied into directory, keeping original filename
        dest_path = Path(temp_workspace) / dirname / filename
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_file_preserves_content(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "source.txt"
        content = "Line 1\nLine 2\nSpecial chars: !@#$%^&*()\n你好世界"

        # Create source file
        source_path = Path(temp_workspace) / filename
        source_path.write_text(content, encoding="utf-8")

        tool.copy(filename, "destination.txt")

        # Verify content is identical
        dest_path = Path(temp_workspace) / "destination.txt"
        assert dest_path.read_text(encoding="utf-8") == content

    def test_copy_directory_to_new_path(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_dir")

        assert "Successfully copied" in result

        # Verify directory structure copied
        dest_path = Path(temp_workspace) / "copied_dir"
        assert dest_path.is_dir()
        assert (dest_path / "file1.txt").exists()
        assert (dest_path / "file2.txt").exists()
        assert (dest_path / "file3.txt").exists()

    def test_copy_directory_into_directory(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        # Create target directory
        target_dir = Path(temp_workspace) / "target"
        target_dir.mkdir()

        result = tool.copy(dirname, "target")

        assert "Successfully copied" in result

        # Verify directory copied into target directory
        dest_path = target_dir / dirname
        assert dest_path.is_dir()
        assert (dest_path / "file1.txt").exists()

    def test_copy_nested_directory(self, temp_workspace, nested_structure):
        dirname = nested_structure
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_nested")

        assert "Successfully copied" in result

        # Verify complete nested structure copied
        dest_path = Path(temp_workspace) / "copied_nested"
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

        # Create destination file
        dest_path = Path(temp_workspace) / "existing.txt"
        dest_path.write_text("existing content", encoding="utf-8")

        with pytest.raises(FileExistsError) as exc_info:
            tool.copy(filename, "existing.txt")

        assert "already exists at destination" in str(exc_info.value)
        assert "Copy aborted to prevent overwrite" in str(exc_info.value)

    def test_copy_directory_to_existing_directory_with_same_name(self, temp_workspace, directory_with_files):
        dirname = directory_with_files
        tool = FileSystemToolset(temp_workspace)

        # Create target directory with same-name subdirectory
        target_dir = Path(temp_workspace) / "target"
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
        dest_path = Path(temp_workspace) / "copied_empty.txt"
        assert dest_path.exists()
        assert dest_path.read_text(encoding="utf-8") == ""

    def test_copy_empty_directory(self, temp_workspace, empty_directory):
        dirname = empty_directory
        tool = FileSystemToolset(temp_workspace)

        result = tool.copy(dirname, "copied_empty_dir")

        assert "Successfully copied" in result
        dest_path = Path(temp_workspace) / "copied_empty_dir"
        assert dest_path.is_dir()
        assert len(list(dest_path.iterdir())) == 0


class TestIntegration:
    def test_write_edit_workflow(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)
        filename = "workflow_test.txt"

        # Write file
        initial_content = "Initial content\nSecond line"
        tool.write_file(filename, initial_content)

        # Edit file
        result = tool.edit_file(filename, "Initial content", "Modified content")

        # Verify edit successful
        assert "---" in result
        file_path = Path(temp_workspace) / filename
        final_content = file_path.read_text(encoding="utf-8")
        assert "Modified content" in final_content
        assert "Initial content" not in final_content

    def test_copy_edit_workflow(self, temp_workspace, sample_text_file):
        filename, _ = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        # Copy file
        tool.copy(filename, "copied_for_edit.txt")

        # Edit copied file
        result = tool.edit_file("copied_for_edit.txt", "Line 1", "Modified Line 1")

        # Verify copied file was successfully edited
        assert "---" in result
        copied_path = Path(temp_workspace) / "copied_for_edit.txt"
        content = copied_path.read_text(encoding="utf-8")
        assert "Modified Line 1" in content

        # Verify original file unaffected
        original_path = Path(temp_workspace) / filename
        original_content = original_path.read_text(encoding="utf-8")
        assert "Line 1" in original_content

    def test_read_write_edit_delete_workflow(self, temp_workspace, sample_text_file):
        filename, original_content = sample_text_file
        tool = FileSystemToolset(temp_workspace)

        # Read file
        read_content = tool.read_file(filename)
        assert original_content in read_content

        # Overwrite file (allowed because already read)
        new_content = "Completely new content\nNew line 2"
        tool.write_file(filename, new_content)

        # Edit file
        tool.edit_file(filename, "Completely new content", "Edited content")

        # Verify file content
        file_path = Path(temp_workspace) / filename
        assert "Edited content" in file_path.read_text(encoding="utf-8")

        # Delete file
        result = tool.delete(filename)
        assert "deleted successfully" in result
        assert not file_path.exists()

    def test_read_file_set_consistency_across_operations(self, temp_workspace):
        tool = FileSystemToolset(temp_workspace)

        # Create and read file
        filename1 = "file1.txt"
        file1_path = Path(temp_workspace) / filename1
        file1_path.write_text("Content 1", encoding="utf-8")
        tool.read_file(filename1)

        # Verify file in read_set
        abs_path1 = str(file1_path)
        assert abs_path1 in tool._read_file_set

        # Copy file
        tool.copy(filename1, "file2.txt")

        # Read copied file
        tool.read_file("file2.txt")
        abs_path2 = str(Path(temp_workspace) / "file2.txt")
        assert abs_path2 in tool._read_file_set

        # Delete original file
        tool.delete(filename1)
        assert abs_path1 not in tool._read_file_set

        # Verify copied file still in read_set
        assert abs_path2 in tool._read_file_set

        # Overwrite copied file (should be allowed)
        tool.write_file("file2.txt", "New content")

        # Verify file content updated
        file2_path = Path(temp_workspace) / "file2.txt"
        assert file2_path.read_text(encoding="utf-8") == "New content"

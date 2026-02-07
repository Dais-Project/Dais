import pytest
from src.agent.tool.builtin_tools.file_system import BuiltInToolset


@pytest.fixture(autouse=True)
def mock_built_in_toolset_init(mocker):
    mocker.patch.object(BuiltInToolset, "__init__", return_value=None)


@pytest.fixture
def sample_text_file(temp_workspace):
    file_path = temp_workspace / "sample.txt"
    content = "Line 1\nLine 2\nLine 3\nSpecial chars: !@#$%"
    file_path.write_text(content, encoding="utf-8")
    return "sample.txt", content


@pytest.fixture
def multiple_files(temp_workspace):
    files = {}

    file1 = temp_workspace / "file1.txt"
    content1 = "Content of file 1"
    file1.write_text(content1, encoding="utf-8")
    files["file1.txt"] = content1

    file2 = temp_workspace / "file2.txt"
    content2 = "Content of file 2\nSecond line"
    file2.write_text(content2, encoding="utf-8")
    files["file2.txt"] = content2

    file3 = temp_workspace / "file3.txt"
    content3 = "Content of file 3"
    file3.write_text(content3, encoding="utf-8")
    files["file3.txt"] = content3

    return files


@pytest.fixture
def nested_directory(temp_workspace):
    base = temp_workspace

    (base / "dir1").mkdir()
    (base / "dir1" / "subdir1").mkdir()
    (base / "dir2").mkdir()

    (base / "file1.txt").write_text("Root file 1", encoding="utf-8")
    (base / "file2.txt").write_text("Root file 2", encoding="utf-8")
    (base / "dir1" / "file3.txt").write_text("Dir1 file 3", encoding="utf-8")
    (base / "dir1" / "subdir1" / "file4.txt").write_text("Subdir1 file 4", encoding="utf-8")
    (base / "dir2" / "file5.txt").write_text("Dir2 file 5", encoding="utf-8")

    return temp_workspace


@pytest.fixture
def directory_with_hidden_and_gitignore(temp_workspace):
    base = temp_workspace

    (base / ".hidden_dir").mkdir()
    (base / ".hidden_dir" / "hidden.txt").write_text("Hidden content", encoding="utf-8")
    (base / ".hidden.txt").write_text("Hidden file", encoding="utf-8")

    (base / "keep.txt").write_text("Visible file", encoding="utf-8")
    (base / "ignore.log").write_text("Ignored log", encoding="utf-8")

    (base / "secret").mkdir()
    (base / "secret" / "secret.txt").write_text("Secret content", encoding="utf-8")

    gitignore_content = "*.log\nsecret/\n"
    (base / ".gitignore").write_text(gitignore_content, encoding="utf-8")

    return temp_workspace


@pytest.fixture
def empty_file(temp_workspace):
    file_path = temp_workspace / "empty.txt"
    file_path.write_text("", encoding="utf-8")
    return "empty.txt"


@pytest.fixture
def empty_directory(temp_workspace):
    dir_path = temp_workspace / "empty_dir"
    dir_path.mkdir()
    return "empty_dir"


@pytest.fixture
def file_with_content(temp_workspace):
    file_path = temp_workspace / "editable.txt"
    content = "Original content\nSecond line\nThird line"
    file_path.write_text(content, encoding="utf-8")
    return "editable.txt", content


@pytest.fixture
def directory_with_files(temp_workspace):
    dir_path = temp_workspace / "test_dir"
    dir_path.mkdir()

    (dir_path / "file1.txt").write_text("File 1 content", encoding="utf-8")
    (dir_path / "file2.txt").write_text("File 2 content", encoding="utf-8")
    (dir_path / "file3.txt").write_text("File 3 content", encoding="utf-8")

    return "test_dir"


@pytest.fixture
def nested_structure(temp_workspace):
    base = temp_workspace / "complex_structure"
    base.mkdir()

    (base / "level1").mkdir()
    (base / "level1" / "level2").mkdir()
    (base / "level1" / "level2" / "level3").mkdir()

    (base / "root.txt").write_text("Root level file", encoding="utf-8")
    (base / "level1" / "l1.txt").write_text("Level 1 file", encoding="utf-8")
    (base / "level1" / "level2" / "l2.txt").write_text("Level 2 file", encoding="utf-8")
    (base / "level1" / "level2" / "level3" / "l3.txt").write_text("Level 3 file", encoding="utf-8")

    return "complex_structure"


@pytest.fixture
def file_with_duplicate_content(temp_workspace):
    file_path = temp_workspace / "duplicate.txt"
    content = "Duplicate line\nUnique line\nDuplicate line\nAnother unique line"
    file_path.write_text(content, encoding="utf-8")
    return "duplicate.txt", content

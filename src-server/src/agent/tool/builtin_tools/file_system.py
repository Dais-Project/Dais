import difflib
import shutil
from pathlib import Path
from markitdown import MarkItDown
from ..toolset_wrapper import built_in_tool, BuiltInToolset

class FileSystemToolset(BuiltInToolset):
    def __init__(self, cwd: str):
        super().__init__()

        if cwd == "~":
            cwd = str(Path.home())
        self.cwd = cwd
        self.md = MarkItDown()

        # this set should stores file absolute path
        self._read_file_set = set()

    def _is_markitdown_convertable_binary(self, path: str) -> bool:
        return Path(path).suffix.lower() in (".pdf", ".docx", ".pptx", ".xlsx", ".epub")

    @built_in_tool
    def read_file(self, path: str, enable_line_numbers: bool = False) -> str:
        """
        Request to read the contents of a file at the specified path.
        For text files, this tool will directly return the file content;
        for .pdf, .docx, .pptx, .xlsx, .epub files, this tool will convert the file to markdown format and return the markdown text.
        Use this when you need to examine the contents of an existing file you do not know the contents of,\
        for example to analyze code, review text files, or extract information from configuration files.

        Args:
            path: (required) The path of the file to read (relative to the current working directory).
            enable_line_numbers: (optional, default: False) Whether to add line numbers to the file content, if you want to edit the read file later, you may need to enable this option.

        Raises:
            FileNotFoundError: If the specified path does not exist            

        Returns:
            The contents of the file, with optional line numbers added.
        """
        abs_path = Path(self.cwd) / path

        if not abs_path.exists():
            raise FileNotFoundError(f"File not found at {path}")

        if self._is_markitdown_convertable_binary(path):
            result = self.md.convert(abs_path)
            lines = result.markdown.splitlines()
        else:
            with open(abs_path, "r", encoding="utf-8") as f:
                lines = f.read().splitlines()

        self._read_file_set.add(str(abs_path))

        if enable_line_numbers:
            return "\n".join(f"{i:4d} | {line}" for i, line in enumerate(lines, 1))
        else:
            return "\n".join(lines)

    @built_in_tool
    def read_file_batch(self, paths: list[str], enable_line_numbers: bool = False) -> str:
        """
        Request to read the contents of multiple files at the specified paths.
        This tool will directly return the file content for text files;
        for .pdf, .docx, .pptx, .xlsx, .epub files, this tool will convert the file to markdown format and return the markdown text.
        Use this when you need to examine the contents of multiple existing files you do not know the contents of,
        for example to analyze code, review text files, or extract information from configuration files.

        Args:
            paths: (required) The paths of the files to read (relative to the current working directory).
            enable_line_numbers: (optional, default: False) Whether to add line numbers to the file content, if you want to edit the read file later, you may need to enable this option.

        Returns:
            The contents of the files with XML wrapper, with optional line numbers added.

        Examples:
            Read single file with line numbers:
            >>> read_file_batch(["test.txt"], True)

            <file_content path="test.txt">
            1 | Hello World!
            2 | This is a test file.
            3 | It contains multiple lines.
            4 | And some special characters like !@#$%^&*()_+{}|:"<>?
            </file_content>

            - - -

            Read multiple files when some files do not exist:
            >>> read_file_batch(["test.txt", "test.pdf", "not_exist.txt"], False)

            <file_content path="test.txt">
            Hello World!
            This is a test file.
            It contains multiple lines.
            And some special characters like !@#$%^&*()_+{}|:"<>?
            </file_content>
            <file_content path="test.pdf">
            # Test PDF File
            This is a test PDF file.
            It contains multiple pages.
            And some special characters like !@#$%^&*()_+{}|:"<>?
            </file_content>
            <file_content path="not_exist.txt">
            Error: File not found at not_exist.txt
            </file_content>
        """
        result = ""
        for path in paths:
            try:
                file_content = self.read_file(path, enable_line_numbers)
            except Exception as e:
                file_content = f"Error: {e}"
            result += f"""\
<file_content path="{path}">
{file_content}
</file_content>
"""
        return result

    @built_in_tool
    def list_directory(self, path: str = ".", recursive: bool = False, max_depth: int | None = None) -> str:
        """
        Request to list files and directories within the specified directory.

        Use this when you need to explore the project structure, understand the codebase organization,
        or find specific files. The tool provides a numbered list with type indicators ([file], [dir], or [symlink])
        for easy reference. Directories are listed before files, and items are sorted alphabetically
        within their type.

        Args:
            path: (optional, default: ".") The path of the directory to list contents for
                  (relative to the current working directory).
            recursive: (optional, default: False) Whether to list files recursively.
                       Use True for recursive listing, False for top-level only.
            max_depth: (optional, default: None) Maximum depth for recursive listing.
                       - None: No limit (list all nested directories)
                       - 1: Only direct children (equivalent to recursive=False)
                       - 2: List up to 2 levels deep
                       - n: List up to n levels deep
                       This parameter is only effective when recursive=True.

        Returns:
            A formatted string containing:
            - Directory header showing the path being listed
            - Numbered list of directories (first) and files (second) with type indicators
            - For recursive mode: hierarchical numbering (e.g., 1, 1.1, 1.1.1)
            - Directories are marked with [dir], files with [file], symlinks with [symlink -> target]
            - Items are sorted: directories first, then files, alphabetically within each type

        Raises:
            FileNotFoundError: If the specified path does not exist
            NotADirectoryError: If the specified path is not a directory
            PermissionError: If the user does not have permission to access the directory

        Examples:
            Non-recursive listing:
            >>> list_directory("src")
            Directory: src/
            1 [dir] agent
            2 [dir] db
            3 [symlink -> /usr/local/lib] external_lib
            4 [file] __init__.py
            5 [file] app.py

            - - -

            Recursive listing with depth limit:
            >>> list_directory("src", recursive=True, max_depth=2)
            Directory: src/
            1 [dir] agent
              1.1 [dir] tools
              1.2 [file] context.py
            2 [dir] db
              2.1 [dir] models
            3 [symlink -> <unreadable>] unreadable_link
            4 [file] __init__.py

            - - -

            Unlimited recursive listing:
            >>> list_directory("src", recursive=True)
            Directory: src/
            1 [dir] agent
              1.1 [dir] tools
                1.1.1 [file] file_system.py
              1.2 [file] context.py
            2 [symlink -> /external/data] data
            3 [file] __init__.py
        """

        def format_item(item: Path) -> str:
            if item.is_symlink():
                try:
                    target = item.readlink()
                    item_type = f"symlink -> {target}"
                except (OSError, ValueError):
                    item_type = "symlink -> <unreadable>"
            elif item.is_dir():
                item_type = "dir"
            else:
                item_type = "file"
            return f"[{item_type}] {item.name}"

        def format_items_flat(directory: Path) -> list[str]:
            """Format directory contents in non-recursive mode."""
            try:
                items = sorted(
                    directory.iterdir(),
                    key=lambda x: (not x.is_dir(), x.name.lower())
                )
            except PermissionError:
                return ["Error: Permission denied"]

            if len(items) == 0:
                return ["(empty directory)"]

            lines = []
            for idx, item in enumerate(items, 1):
                lines.append(f"{idx} {format_item(item)}")

            return lines

        def format_items_recursive(
            directory: Path,
            prefix: str,
            indent: int,
            current_depth: int,
            max_depth: int | None
        ) -> list[str]:
            """
            Recursively format directory contents.

            Args:
                directory: Current directory path
                prefix: Number prefix (e.g., "1.", "1.1.")
                indent: Indentation level
                current_depth: Current depth (starting from 1)
                max_depth: Maximum depth limit
            """
            if max_depth is not None and current_depth > max_depth:
                return []

            try:
                items = sorted(
                    directory.iterdir(),
                    key=lambda x: (not x.is_dir(), x.name.lower())
                )
            except PermissionError:
                return []

            indent_str = "  " * indent

            if len(items) == 0:
                return [indent_str + "(empty directory)"]

            lines = []
            for idx, item in enumerate(items, 1):
                current_prefix = f"{prefix}{idx}" if prefix else str(idx)

                lines.append(f"{indent_str}{current_prefix} {format_item(item)}")
                if item.is_dir():
                    lines.extend(format_items_recursive(
                        item,
                        f"{current_prefix}.",
                        indent + 1,
                        current_depth + 1,
                        max_depth
                    ))

            return lines

        if max_depth is not None and max_depth < 1:
            raise ValueError(f"Invalid max_depth: {max_depth}")

        abs_path = Path(self.cwd) / path

        if not abs_path.exists():
            raise FileNotFoundError(f"Directory not found at {path}")
        if not abs_path.is_dir():
            raise NotADirectoryError(f"Path {path} is not a directory")

        result_lines = [f"Directory: {path}"]

        if recursive:
            result_lines.extend(format_items_recursive(abs_path, "", 0, 1, max_depth))
        else:
            result_lines.extend(format_items_flat(abs_path))

        return "\n".join(result_lines)

    @built_in_tool
    def write_file(self, path: str, content: str) -> str:
        """
        Request to write content to a file at the specified path.
        Use this when you need to create a new file or overwrite an existing file with new content.
        **WARNING**: It will raise an error when overwriting existing files that are not read before.

        Args:
            path: (required) The path of the file to write (relative to the current working directory).
            content: (required) The content to write to the file.

        Returns:
            A success message if the file was written successfully.

        Examples:
            >>> write_file("test.txt", "Hello World!")
            File written successfully.
        """
        abs_path = Path(self.cwd) / path

        if abs_path.exists() and str(abs_path) not in self._read_file_set:
            raise PermissionError(f"File already exists and was not read before: {path}")

        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(content, encoding="utf-8")
        return "File written successfully."

    @built_in_tool
    def edit_file(self, path: str, old_content: str, new_content: str) -> str:
        """
        Request to edit the content of a file at the specified path.
        Use this when you need to edit an existing file with existing content you have read before.
        If the passed in old_content does not match the actual content or match in multiple places, it will raise an error.

        Args:
            path: (required) The path of the file to edit (relative to the current working directory).
            old_content: (required) The old content to replace.
            new_content: (required) The new content to replace with.

        Returns:
            The diff of the old content and the new content.
        """

        def generate_diff(old_content: str, new_content: str, file_name: str) -> str:
            diff = difflib.unified_diff(
                old_content.splitlines(),
                new_content.splitlines(),
                fromfile=f"a/{file_name}",
                tofile=f"b/{file_name}",
            )
            return "\n".join(diff)

        abs_path = Path(self.cwd) / path

        if not abs_path.exists():
            raise FileNotFoundError(f"File not found at {path}")

        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()

        count = content.count(old_content)
        if count == 0:
            raise ValueError(f"Content not found in file: {path}")
        if count > 1:
            raise ValueError(f"Content found multiple times in file: {path}")

        old_file_content = content
        new_file_content = content.replace(old_content, new_content, 1)
        abs_path.write_text(new_file_content, encoding="utf-8")
        return generate_diff(old_file_content, new_file_content, path)

    @built_in_tool
    def delete(self, path: str) -> str:
        """
        Request to delete a file or directory at the specified path.

        Args:
            path: (required) The path of the file or directory to delete (relative to the current working directory).

        Returns:
            A success message if the target was deleted successfully.
        """
        abs_path = Path(self.cwd) / path

        if not abs_path.exists():
            raise FileNotFoundError(f"'{path}' not found.")

        if abs_path.is_dir():
            shutil.rmtree(abs_path)
        else:
            if str(abs_path) in self._read_file_set:
                self._read_file_set.remove(str(abs_path))
            abs_path.unlink()
        return f"'{path}' deleted successfully."

    @built_in_tool
    def copy(self, src: str, dest: str) -> str:
        """
        Request to copy a file or directory from source to destination.

        Behavior:
        1. If `dest` does not exist: Copies `src` to `dest` (renaming it).
        2. If `dest` exists and is a directory: Copies `src` INTO `dest` (keeping original filename).
        3. If `dest` exists and is a file: Raises FileExistsError (to prevent accidental overwrite).

        Args:
            src: (required) The path of the source (relative to the current working directory).
            dest: (required) The path of the destination (relative to the current working directory).

        Returns:
            A success message if the target was copied successfully.
        """
        src_path = Path(self.cwd) / src
        dest_path = Path(self.cwd) / dest

        if not src_path.exists():
            raise FileNotFoundError(f"'{src}' not found.")

        if dest_path.is_dir():
            dest_path = dest_path / src_path.name

        if dest_path.exists():
            raise FileExistsError(f"Target '{dest_path.name}' already exists at destination. Copy aborted to prevent overwrite.")

        if src_path.is_dir():
            shutil.copytree(src_path, dest_path)
        else:
            shutil.copy2(src_path, dest_path)
        return f"Successfully copied '{src}' to '{dest}'"

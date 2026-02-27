import difflib
import shutil
import pathspec
from typing import Annotated, Iterator, TypedDict
from pathlib import Path
from markitdown import MarkItDown
from binaryornot.check import is_binary
from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext
from ....db.models import toolset as toolset_models
from ....utils.scandir_recursive import scandir_recursive_bfs
from ....utils.ignore_rules import load_gitignore_spec, should_exclude

class FileSystemToolset(BuiltInToolset):
    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)

        self._md = MarkItDown()

        # this set should stores file absolute path
        self._read_file_set = set()

    @property
    def name(self) -> str: return "FileSystem"

    def _is_markitdown_convertable_binary(self, path: str) -> bool:
        return Path(path).suffix.lower() in (".pdf", ".docx", ".pptx", ".xlsx", ".epub")

    @built_in_tool
    def read_file(self,
                  path: Annotated[str,
                    "The path of the file to read (relative to the current working directory)."],
                  enable_line_numbers: Annotated[bool,
                    "(Default: False) Whether to add line numbers to the file content, if you want to edit the read file later, you may need to enable this option."] = False
                 ) -> str:
        """
        Request to read the contents of a file at the specified path.
        For text files, this tool will directly return the file content;
        for .pdf, .docx, .pptx, .xlsx, .epub files, this tool will convert the file to markdown format and return the markdown text.
        Use this when you need to examine the contents of an existing file you do not know the contents of,\
        for example to analyze code, review text files, or extract information from configuration files.

        Raises:
            FileNotFoundError: If the specified path does not exist            

        Returns:
            The contents of the file, with optional line numbers added.
        """
        abs_path = self._ctx.cwd / path

        if not abs_path.exists():
            raise FileNotFoundError(f"File not found at {path}")

        if self._is_markitdown_convertable_binary(path):
            result = self._md.convert(abs_path)
            lines = result.markdown.splitlines()
        elif is_binary(str(abs_path)):
            raise ValueError(f"File {path} is a binary file, and is not supported to read.")
        else:
            with open(abs_path, "r", encoding="utf-8") as f:
                lines = f.read().splitlines()

        self._read_file_set.add(str(abs_path))

        if enable_line_numbers:
            return "\n".join(f"{i:4d} | {line}" for i, line in enumerate(lines, 1))
        else:
            return "\n".join(lines)

    @built_in_tool
    def read_file_batch(self,
                        paths: Annotated[list[str],
                            "The paths of the files to read (relative to the current working directory)."],
                        enable_line_numbers: Annotated[bool,
                            "(Default: False) Whether to add line numbers to the file content. Enable this if you may edit the file later."] = False
                        ) -> str:
        """
        Request to read the contents of multiple files at the specified paths.
        This tool will directly return the file content for text files;
        for .pdf, .docx, .pptx, .xlsx, .epub files, this tool will convert the file to markdown format and return the markdown text.
        Use this when you need to examine the contents of multiple existing files you do not know the contents of,
        for example to analyze code, review text files, or extract information from configuration files.

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
    def list_directory(self,
                       path: Annotated[str,
                        "(Default: \".\") The path of the directory to list contents for (relative to the current working directory)."] = ".",
                       recursive: Annotated[bool,
                        "(Default: False) Whether to list files recursively. Use True for recursive listing, False for top-level only."] = False,
                       max_depth: Annotated[int | None,
                        """
                        (Default: None) Maximum depth for recursive listing.
                        - None: No limit (list all nested directories)
                        - 1: Only direct children (equivalent to recursive=False)
                        - 2: List up to 2 levels deep
                        - n: List up to n levels deep
                        This parameter is only effective when recursive=True.
                        """] = None,
                       show_all: Annotated[bool,
                        "(Default: False) Whether to include hidden files and files ignored by .gitignore."\
                        "Use this if you can't find a specific file you're looking for."] = False,
                       ) -> str:
        """
        Request to list files and directories within the specified directory.

        Use this when you need to explore the project structure, understand the codebase organization,
        or find specific files. The tool provides a numbered list with type indicators ([file], [dir], or [symlink])
        for easy reference. Directories are listed before files, and items are sorted alphabetically
        within their type.

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

        def filter_items(items: Iterator[Path], spec: pathspec.PathSpec | None) -> Iterator[Path]:
            nonlocal include_hidden, abs_path
            return filter(lambda x: not should_exclude(x, spec, abs_path, include_hidden), items)

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
                    filter_items(directory.iterdir(), gitignore_spec),
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

            local_gitignore_spec = (load_gitignore_spec(directory)
                                    if not include_gitignored else None)
            if gitignore_spec and local_gitignore_spec:
                local_gitignore_spec = gitignore_spec + local_gitignore_spec

            try:
                items = sorted(
                    filter_items(directory.iterdir(), local_gitignore_spec),
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

        abs_path = self._ctx.cwd / path
        include_hidden = show_all
        include_gitignored = show_all
        gitignore_spec = (load_gitignore_spec(abs_path)
                          if not include_gitignored else None)

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
    def write_file(self,
                   path: Annotated[str,
                    "The path of the file to write (relative to the current working directory)."],
                   content: Annotated[str,
                    "The content to write to the file."]
                   ) -> str:
        """
        Request to write content to a file at the specified path.
        Use this when you need to create a new file or overwrite an existing file with new content.
        If the parent directory of the specified path does not exist, it will be created automatically.
        **WARNING**: It will raise an error when overwriting existing files that are not read before.

        Returns:
            A success message if the file was written successfully.

        Examples:
            >>> write_file("test.txt", "Hello World!")
            File written successfully.
        """
        abs_path = self._ctx.cwd / path

        if abs_path.exists() and str(abs_path) not in self._read_file_set:
            raise PermissionError(f"File already exists and was not read before: {path}")

        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(content, encoding="utf-8")
        return "File written successfully."

    @built_in_tool
    def edit_file(self,
                  path: Annotated[str,
                    "The path of the file to edit (relative to the current working directory)."],
                  old_content: Annotated[str,
                    "The exact old content to replace. It must match exactly once in the target file."],
                  new_content: Annotated[str,
                    "The new content that will replace old_content."]
                  ) -> str:
        """
        Request to edit the content of a file at the specified path.
        Use this when you need to edit an existing file with existing content you have read before.
        If the passed in old_content does not match the actual content or match in multiple places, it will raise an error.

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

        abs_path = self._ctx.cwd / path

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
    def delete(self,
               path: Annotated[str,
                "The path of the file or directory to delete (relative to the current working directory)."]
               ) -> str:
        """
        Request to delete a file or directory at the specified path.

        Returns:
            A success message if the target was deleted successfully.
        """
        abs_path = self._ctx.cwd / path

        if not abs_path.exists():
            raise FileNotFoundError(f"'{path}' not found.")

        if abs_path.is_dir():
            shutil.rmtree(abs_path)
        else:
            if str(abs_path) in self._read_file_set:
                self._read_file_set.remove(str(abs_path))
            abs_path.unlink()
        return f"'{path}' deleted successfully."

    class SearchFileResult(TypedDict):
        search_root: str
        total: int
        matches: list[str]

    @built_in_tool
    def search_file(self,
                    pattern: Annotated[str,
                        """
                        The glob pattern used to match files.
                        Pattern examples:
                        - "*.py" matches all Python files
                        - "main.*" matches files like "main.py" and "main.txt"
                        - "docs/*.md" matches all Markdown files in the "docs" directory
                        """],
                    path: Annotated[str,
                        "(Default: \".\") The path of the directory to search in (relative to the current working directory)."] = ".",
                    limit: Annotated[int,
                        "(Default: 60) The maximum number of matching file paths to return."] = 60,
                    show_all: Annotated[bool,
                        "(Default: False) Whether to include hidden files and files ignored by .gitignore. "
                        "Use this if you can't find a specific file you're looking for."] = False
                   ) -> SearchFileResult:
        """
        Request to search for files matching the specified pattern within the specified directory.
        Use this when you need to find specific files in the project directory.

        Returns:
            A JSON object containing the search results.
            The object has the following properties:
            - search_root: The root directory for the search.
            - total: The total number of matching files found.
            - matches: A list of relative file paths that match the pattern.
        """

        def scan_collect(directory: Path) -> list[str]:
            matches = []
            for entry in scandir_recursive_bfs(directory, MAX_SCAN_LIMIT, include_hidden, include_gitignored):
                if len(matches) >= limit: break
                path = Path(entry)
                if path.match(pattern):
                    matches.append(path.relative_to(abs_path).as_posix())
            return matches

        MAX_SCAN_LIMIT = 200_000
        abs_path = self._ctx.cwd / path
        include_hidden = show_all
        include_gitignored = show_all

        if not abs_path.exists():
            raise FileNotFoundError(f"Directory not found at {path}")
        if not abs_path.is_dir():
            raise NotADirectoryError(f"Path {path} is not a directory")

        results = scan_collect(abs_path)
        return {
            "search_root": abs_path.as_posix(),
            "total": len(results),
            "matches": results,
        }

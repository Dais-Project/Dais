import asyncio
import difflib
import os
import xml.etree.ElementTree as ET
from typing import Annotated, Literal, TypedDict, override
from pathlib import Path as StdPath
from string import Template
from anyio import Path as AnyioPath
from loguru import logger
from dais_scantree import bfs as scantree_bfs, dfs as scantree_dfs
from dais_scantree.ignore_rule import load_gitignore_spec
from src.db import db_context
from src.db.models import toolset as toolset_models
from src.services.markdown_cache import MarkdownCacheService
from src.binaries import RIPGREP_PATH
from src.settings import use_app_setting_manager
from src.utils import MarkdownConverter
from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext, BuiltInToolDefaults
from ...notes import NoteManager
from ...skills import SkillMaterializer
from ...prompts import create_one_turn_llm, SemanticFileAnalysis, SemanticFileAnalysisInput


# Since `is_binary` from binaryornot sometimes misdetects some files as binary,
# we defines a enhanced wrapper function here.
# TODO: remove this function once binaryornot.check.is_binary is fixed.
def is_binary(path: StdPath) -> bool:
    from binaryornot.helpers import has_binary_extension, is_binary_string
    if has_binary_extension(path):
        return True
    with open(path, "rb") as f:
        bytes = f.read()
        return is_binary_string(bytes)

class PathExpander:
    def __init__(self, path_envs: dict[str, str]):
        self._path_envs = path_envs

    def substitute(self, path: str) -> str:
        template = Template(path)
        return template.safe_substitute(self._path_envs)

class FileSystemToolset(BuiltInToolset):
    _logger = logger.bind(name="FileSystemToolset")

    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)
        self._path_expander = PathExpander({
            **SkillMaterializer.get_skill_dir_env(),
            **NoteManager.get_notes_dir_env(ctx.workspace_id),
        })
        self._markdown_converter = MarkdownConverter()

    @property
    @override
    def name(self) -> str: return "FileSystem"

    def _resolve_path(self, file_path: str) -> AnyioPath:
        expanded_path = self._path_expander.substitute(file_path)
        expanded_path = os.path.expanduser(expanded_path)
        return AnyioPath(self._ctx.cwd / expanded_path)

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=True))
    async def read_file(self,
                        path: Annotated[str,
                          "The path of the file to read (relative to the current working directory)."],
                        offset: Annotated[int, "The line number to start reading from (1-based)."] = 1,
                        max_lines: Annotated[int, "The maximum number of lines to read."] = 2000,
                        semantic: Annotated[str | None,
                            """
                            When provided, this parameter will be used as prompt to pass to another model to semantically analyse the ENTIRE file content (offset and max_lines are ignored).
                            PREFER this over normal reading when:
                            - The file is likely to be long (e.g. PDF, Word documents, reports)
                            - The goal is to understand, summarize, or extract information from the file
                            NOTE: When the analysis failed, it will fallback to normal reading mode and returns raw file content instead — check the `mode` attribute to know which mode was used.
                            """] = None,
                        ) -> str:
        """
        Read the contents of a file at the specified path.
        For text files, this tool will directly return the file content;
        for .pdf, .docx, .pptx, .xlsx, .epub files, this tool will convert the file to markdown format and return the markdown text.

        Returns:
            A XML string with the file content and metadata as attributes:
            - start_line: The line number of the first line returned (1-based), only exist for "normal" mode
            - end_line: The line number of the last line returned (1-based), only exist for "normal" mode
            - total_lines: The total number of lines in the file
            - mode: The actual mode used, can be one of "normal" and "semantic"

            Normal mode example:
                <file_content start_line="1" end_line="50" total_lines="312" mode="normal">
                def foo():
                    ...
                </file_content>

            Semantic mode example (read_file(path="report.pdf", semantic="Summarize the key findings")):
                <file_content total_lines="312" mode="semantic">
                The report identifies three main findings: ...
                </file_content>

        To read the next chunk in normal mode, pass end_line + 1 as the offset in the next call.
        """
        async def convert_to_markdown_with_cache(path: AnyioPath) -> str:
            async with db_context() as db_session:
                markdown_cache_service = MarkdownCacheService(db_session, self._ctx.workspace_id, self._ctx.cwd)
                cached = await markdown_cache_service.get(path)
                if cached is not None: return cached

                converted = await self._markdown_converter.convert(path)
                await markdown_cache_service.set(path, converted)
                return converted

        def format_result(content: str,
                          total_lines: int,
                          mode: Literal["normal", "semantic"],
                          start_line: int | None = None,
                          end_line: int | None = None) -> str:
            attributes = {
                "total_lines": str(total_lines),
                "mode": mode
            }
            if start_line is not None:
                attributes["start_line"] = str(start_line)
            if end_line is not None:
                attributes["end_line"] = str(end_line)
            root = ET.Element("file_content", attrib=attributes)
            root.text = content
            return ET.tostring(root, encoding="unicode")

        abs_path = self._resolve_path(path)

        if not await abs_path.exists():
            raise FileNotFoundError(f"File not found at {path}")

        if self._markdown_converter.is_convertable_binary(abs_path):
            result = await convert_to_markdown_with_cache(abs_path)
            lines = result.splitlines()
        elif is_binary(StdPath(abs_path)):
            raise ValueError(f"File {path} is a binary file, and is not supported to read.")
        else:
            lines = (await abs_path.read_text("utf-8")).splitlines()

        if semantic is not None:
            settings = use_app_setting_manager().settings
            if settings.flash_model is None:
                # tells to the agent that the flash model is not configured so that the agent will not retry semantic reading.
                raise ValueError("Semantic analysis is not available: analyzer model is not configured.")
            try:
                llm = await create_one_turn_llm(settings.flash_model)
                analyzer = SemanticFileAnalysis(llm)
                analyze_task = analyzer(SemanticFileAnalysisInput(
                    path=path,
                    content="\n".join(lines),
                    semantic=semantic,
                ))
                result = await asyncio.wait_for(analyze_task, 60)
                return format_result(result, total_lines=len(lines), mode="semantic")
            except Exception:
                self._logger.exception(f"Failed to semantically read file '{path}'")

        result_lines = lines[(offset - 1):(offset + max_lines - 1)]
        return format_result(
            "\n".join(result_lines),
            start_line=offset,
            end_line=offset + len(result_lines) - 1,
            total_lines=len(lines),
            mode="normal")

    @built_in_tool(validate=True)
    async def write_file(self,
                         path: Annotated[str,
                          "The path of the file to write (relative to the current working directory)."],
                         content: Annotated[str,
                          "The content to write to the file."],
                         append: Annotated[bool,
                          "If True, content will be appended to the end of the file instead of overwriting it."] = False,
                         ) -> str:
        """
        Write content to a file at the specified path.
        Use this when you need to create a new file or overwrite an existing file with new content.
        If the parent directory of the specified path does not exist, it will be created automatically.

        IMPORTANT: This tool overwrites existing files. Before using it, ensure the target file does not contain important information that should be preserved.

        Examples:
            >>> write_file("test.txt", "Hello World!")
            File written successfully.

        Returns:
            A success message if the file was written successfully.
        """
        abs_path = self._resolve_path(path)
        await abs_path.parent.mkdir(parents=True, exist_ok=True)

        open_mode: Literal["a", "w"] = "a" if append else "w"
        async with await abs_path.open(open_mode, encoding="utf-8") as f:
            await f.write(content)
        return "File written successfully."

    @built_in_tool(validate=True)
    async def edit_file(self,
                        path: Annotated[str,
                            "The path of the file to edit (relative to the current working directory)."],
                        old_content: Annotated[str,
                            "The exact snippet to be replaced. Must match exactly once in the file."],
                        new_content: Annotated[str,
                            "The new snippet that will replace old_content."],
                        expected_replacements: Annotated[int,
                            "Number of replacements expected. Use when you want to replace multiple occurrences of the same text."] = 1
                        ) -> str:
        """
        Edit a file by replacing a specific snippet with new content.
        `old_content` and `new_content` should be the MINIMAL snippet necessary to make the change (though you may include a few extra lines BEFORE and AFTER the target text to ensure uniqueness).

        Use this when you need to edit an existing file with existing content you have read before.
        If you intend to replace multiple identical occurrences at once, set `expected_replacements` to the exact count.
        The tool will raise an error if the actual count is fewer than `expected_replacements`.

        Returns:
            The unified diff of the applied change.

        Note:
            If old_content matches more times than expected, expand it to include more surrounding context until it uniquely identifies the target location(s).
        """
        def generate_diff(old_content: str, new_content: str, file_name: str) -> str:
            diff = difflib.unified_diff(
                old_content.splitlines(),
                new_content.splitlines(),
                fromfile=f"a/{file_name}",
                tofile=f"b/{file_name}",
            )
            return "\n".join(diff)

        abs_path = self._resolve_path(path)

        if not await abs_path.exists():
            raise FileNotFoundError(f"File not found at {path}")

        content = await abs_path.read_text("utf-8")
        count = content.count(old_content)
        if count == 0:
            raise ValueError(f"Content not found in file: {path}")
        if count < expected_replacements:
            raise ValueError(
                f"Expected {expected_replacements} occurrence(s) of the given content in {path}, "
                f"but found {count}. Adjust `old_content` or `expected_replacements` accordingly."
            )

        old_file_content = content
        new_file_content = content.replace(old_content, new_content, expected_replacements)
        await abs_path.write_text(new_file_content, "utf-8")
        diff = await asyncio.to_thread(generate_diff, old_file_content, new_file_content, path)
        return diff

    def _list_directory_impl(self,
                             path: str,
                             recursive: bool,
                             max_depth: int | None,
                             show_all: bool,
                             ) -> str:
        """
        Since the scan logic will be slower after refactored to async version,
        we leave it sync here.
        """
        def format_item(item: StdPath) -> str:
            if item.is_file(follow_symlinks=False):
                return item.name
            elif item.is_dir(follow_symlinks=False):
                return item.name + "/"
            elif item.is_symlink():
                try:
                    target = item.readlink()
                except (OSError, ValueError):
                    return f"{item.name} -> <unreadable>"
                target_path = target.as_posix()
                if (item.parent / target).is_dir():
                    target_path += "/"
                return f"{item.name} -> {target_path}"
            else:
                return "<special file>"

        def format_items_flat(directory: StdPath) -> list[str]:
            """Format directory contents in non-recursive mode."""
            gitignore_spec = (load_gitignore_spec(abs_path)
                             if not include_gitignored else None)

            items: list[StdPath] = []
            for entry in directory.iterdir():
                if not include_hidden and entry.name.startswith("."):
                    continue
                entry_path = entry.name
                if entry.is_dir():
                    entry_path += "/"
                if gitignore_spec is not None:
                    if gitignore_spec.match_file(entry_path):
                        continue
                items.append(entry)

            items = sorted(items, key=lambda x: (not x.is_dir(), x.name.lower()))
            if len(items) == 0:
                return ["(empty directory)"]

            lines = []
            for idx, item in enumerate(items, 1):
                formated = format_item(item)
                lines.append(f"{idx}. {formated}")
            return lines

        def format_items_recursive(directory: StdPath, max_depth: int | None) -> list[str]:
            """
            Recursively format directory contents.

            Args:
                directory: Current directory path
                max_depth: Maximum depth limit
            """
            lines = []
            for entry, depth in scantree_dfs(directory, MAX_SCAN_LIMIT, max_depth, include_hidden, include_gitignored):
                indent = "  " * (depth - 1)
                entry_path = StdPath(entry)
                lines.append(f"{indent}{format_item(entry_path)}")
            return lines

        if max_depth is not None and max_depth < 1:
            raise ValueError(f"Invalid max_depth: {max_depth}")

        MAX_SCAN_LIMIT = 200_000
        abs_path = StdPath(self._resolve_path(path))
        include_hidden = show_all
        include_gitignored = show_all

        if not abs_path.exists():
            raise FileNotFoundError(f"Directory not found at {path}")
        if not abs_path.is_dir():
            raise NotADirectoryError(f"Path {path} is not a directory")

        result_lines = [f"Directory: {abs_path}"]
        if not recursive and max_depth is not None:
            result_lines.append("Warning: max_depth is ignored in non-recursive mode.")
        if recursive:
            result_lines.extend(format_items_recursive(abs_path, max_depth))
        else:
            result_lines.extend(format_items_flat(abs_path))
        return "\n".join(result_lines)

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=True))
    async def list_directory(self,
                             path: Annotated[str,
                              "The path of the directory to list contents for (relative to the current working directory)."] = ".",
                             recursive: Annotated[bool,
                              "Whether to list files recursively. Use True for recursive listing, False for top-level only."] = False,
                             max_depth: Annotated[int | None,
                              """
                              Maximum depth for recursive listing.
                              - Unset: No limit (list all nested directories)
                              - 1: Only direct children (equivalent to recursive=False)
                              - 2: List up to 2 levels deep
                              - n: List up to n levels deep
                              This parameter is only effective when recursive=True.
                              """] = None,
                             show_all: Annotated[bool,
                              "Whether to include hidden files and files ignored by .gitignore."
                              "Use this if you can't find a specific file you're looking for."] = False,
                             ) -> str:
        """
        List files and directories within the specified directory.

        Use this when you need to explore the project structure, understand the codebase organization, or find specific files.
        Directories are indicated by a trailing slash. Symlinks show their target path.

        Examples:
            # Non-recursive listing:
            >>> list_directory("src")
            Directory: /absolute/path/to/src
            1. agent/
            2. db/
            3. external_lib -> /usr/local/lib/
            4. __init__.py
            5. app.py

            - - -

            # Recursive listing with depth limit:
            >>> list_directory("src", recursive=True, max_depth=2)
            Directory: /absolute/path/to/src
            routes/
              endpoint1/
              endpoint2/
            schemas/
            main.py
            broken_link -> <unreadable>
            __init__.py

            - - -

            # Unlimited recursive listing:
            >>> list_directory("src", recursive=True)
            Directory: /absolute/path/to/src
            routes/
              endpoint1/
                subendpoint1/
                  ...
                subendpoint2/
                  ...
            __init__.py

        Returns:
            A formatted string containing:
            - Directory header showing the path being listed (absolute path)
            - Non-recursive mode:
                - Directories (trailing slash) listed before files, alphabetically within each type
                - Numbered list (1. 2. 3. ...)
            - Recursive mode:
                - Indentation (2 spaces per level) represents nesting depth
            - Symlink representation:
                - Symlinks are shown as: name -> target (with trailing slash if target is a directory)
                - Broken or unreadable symlinks are shown as: name -> <unreadable>
            - Special files (sockets, devices, FIFOs) are shown as: <special file>
        """
        return await asyncio.to_thread(
            self._list_directory_impl,
            path,
            recursive,
            max_depth,
            show_all,
        )

    class FindFilesResult(TypedDict):
        search_root: str
        total: int
        matches: list[str]

    def _find_files_impl(self,
                         pattern: str,
                         path: str,
                         limit: int,
                         show_all: bool,
                         ) -> FindFilesResult:
        def scan_collect(directory: StdPath) -> list[str]:
            matches = []
            for entry in scantree_bfs(directory, MAX_SCAN_LIMIT, include_hidden, include_gitignored):
                if len(matches) >= limit:
                    break
                if entry.is_symlink():
                    continue
                entry_path = StdPath(entry)
                if entry_path.match(pattern):
                    matches.append(entry_path.relative_to(abs_path).as_posix())
            return matches

        MAX_SCAN_LIMIT = 200_000
        abs_path = StdPath(self._resolve_path(path))
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

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=True))
    async def find_files(self,
                         pattern: Annotated[str,
                           """
                           A glob pattern to match against file NAMES and PATHS.
                           Pattern examples:
                           - "*.py"       → files whose name ends with .py
                           - "main.*"     → files named "main" with any extension
                           - "docs/*.md"  → .md files inside the "docs/" directory
                           """],
                         path: Annotated[str,
                           "The path of the directory to search in (relative to the current working directory)."] = ".",
                         limit: Annotated[int,
                           "The maximum number of matching file paths to return."] = 60,
                         show_all: Annotated[bool,
                           "Whether to include hidden files and files ignored by .gitignore. "
                           "Use this if you can't find a specific file you're looking for."] = False
                         ) -> FindFilesResult:
        """
        Search for files whose **NAMES or PATHS** match the glob pattern within a directory.
        Use this when you need to locate files by name, extension, or path structure.

        Note:
            This tool matches file paths/names ONLY. It does NOT read or search inside file contents.

        Examples:
            # Find all Python files in the src directory
            >>> find_files(pattern="*.py", path="src")
            {
                "search_root": "/workspace/src",
                "total": 3,
                "matches": [
                    "main.py",
                    "utils/helper.py",
                    "tests/test_main.py"
                ]
            }

            # Find all Markdown and MDX files in the docs directory
            >>> find_files(pattern="docs/*.{md,mdx}")
            {
                "search_root": "/workspace",
                "total": 2,
                "matches": [
                    "docs/README.md",
                    "docs/overview.mdx"
                ]
            }

        Returns:
            A JSON object containing the search results.
            The object has the following properties:
            - search_root: The root directory for the search.
            - total: The total number of matching files found.
            - matches: A list of relative file paths that match the pattern.
        """
        return await asyncio.to_thread(
            self._find_files_impl,
            pattern,
            path,
            limit,
            show_all,
        )

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=True))
    async def search_text(self,
                          regex: Annotated[str,
                            "The search pattern. Supports regular expressions by default. Use simple strings for literal searches."],
                          path: Annotated[str,
                            "The path to search in (relative to the current working directory), accepts either a directory path or a specific file path."] = ".",
                          file_pattern: Annotated[str | None,
                            """
                            A glob pattern to filter which files are searched, matched against file names and paths.
                            Pattern examples:
                            - "*.py"       → files whose name ends with .py
                            - "*.{ts,tsx}" → TypeScript files
                            - "docs/*.md"  → .md files inside the "docs/" directory
                            - "!*.test.py" → exclude test files
                            Leave unset to search all non-binary files.
                            """
                            ] = None
                         ) -> str:
        """
        Perform a regex search across files in a specified directory, providing context-rich results.
        This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.

        Craft your regex patterns carefully to balance specificity and flexibility.
        Use this tool to find any text-based information across the project.
        The results include surrounding context, so analyze the surrounding code to better understand the matches.

        Example:
            >>> search_text(regex="def main\\(", path="src", file_pattern="*.py")
            src/main.py
            52-    return result
            53-
            54:def main():
            55-    parser = argparse.ArgumentParser()
            56-    parser.add_argument("--args")
        """
        resolved_path = str(self._resolve_path(path))
        args = [
            "-n", # show line numbers
            "-C", "2", # 2 lines of context
            "-m", "30", # max 30 matches
            "--path-separator", "/",
            "--smart-case",
            regex,
            resolved_path,
        ]
        if file_pattern:
            args += ["--glob", file_pattern]
        proc = await asyncio.create_subprocess_exec(
            RIPGREP_PATH,
            *args,
            cwd=self._ctx.cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode not in (0, 1):
            raise Exception(stderr.decode())
        return stdout.decode() or "[System] No matches found."

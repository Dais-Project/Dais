import os
import pathspec
from collections.abc import Generator
from pathlib import Path

def resolve_cwd(cwd: str | Path) -> Path:
    """
    Resolve the current working directory.
    If the input is a string, it will be resolved relative to the current working directory.
    If the input is a Path object, it will be resolved as is.
    Returns:
        The absolute path of the current working directory.
    """
    if isinstance(cwd, str):
        if cwd == "~":
            cwd = Path.home()
        else:
            cwd = Path(cwd)
    return cwd.resolve()

def truncate_output(text: str, max_chars: int = 2000) -> str:
    """
    Truncate the output text to the specified maximum number of characters.
    If the text is longer than the maximum number of characters, it will be truncated and the middle part will be replaced with a truncation note.
    """
    TRUNCATION_NOTE = "\n\n... [ Truncated {omitted_count} characters. ] ...\n\n"

    if not text or len(text) <= max_chars:
        return text

    keep_len = (max_chars - len(TRUNCATION_NOTE)) // 2
    header = text[:keep_len]
    footer = text[-keep_len:]
    omitted_count = len(text) - (len(header) + len(footer))
    return header + TRUNCATION_NOTE.format(omitted_count=omitted_count) + footer

def load_gitignore_spec(cwd: Path) -> pathspec.PathSpec | None:
    gitignore_path = cwd / ".gitignore"
    if gitignore_path.exists():
        with open(gitignore_path, "r", encoding="utf-8") as f:
            return pathspec.PathSpec.from_lines("gitignore", f)
    return None

def should_exclude(item: Path, spec: pathspec.PathSpec | None, cwd: Path, include_hidden: bool = False) -> bool:
    is_hidden = item.name.startswith(".")
    if not include_hidden and is_hidden:
        return True

    if spec:
        try:
            rel_path = item.relative_to(cwd).as_posix()
        except ValueError:
            # item is not under cwd
            return False

        if item.is_dir():
            rel_path += "/"
        if spec.match_file(rel_path):
            return True
    return False

def scandir_recursive(directory: str | Path) -> Generator[os.DirEntry, None, None]:
    """
    Returns:
        A generator that yields os.DirEntry objects for all files in the directory tree.
    """
    try:
        with os.scandir(directory) as entries:
            try:
                for entry in entries:
                    if entry.is_symlink(): continue
                    elif entry.is_dir():   yield from scandir_recursive(entry.path)
                    elif entry.is_file():  yield entry
            except OSError:
                # prevents entry being deleted during iteration
                pass
    except (PermissionError, FileNotFoundError):
        # skip permission denied items and non-existent directories
        pass

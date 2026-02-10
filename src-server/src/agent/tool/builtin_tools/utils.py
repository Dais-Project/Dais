import os
from collections.abc import Generator
from pathlib import Path

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

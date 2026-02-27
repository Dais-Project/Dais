import os
from collections import deque
from collections.abc import Generator
from pathlib import Path
from .ignore_rules import load_gitignore_spec, should_exclude

def scandir_recursive_bfs(
    directory: str | Path,
    scan_limit: int,
    include_hidden: bool = False,
    include_gitignored: bool = False,
) -> Generator[os.DirEntry, None, None]:
    """
    Breadth-first recursive scan.

    if scan_limit is less than or equal to 0, the scan will stop immediately and yield nothing.

    Yields:
        os.DirEntry objects for all items (both files and directories) in the directory tree, in BFS order.
    """

    root = Path(directory).resolve()
    root_spec = (
        load_gitignore_spec(root)
        if not include_gitignored
        else None
    )

    queue = deque([(root, root_spec)])
    count = 0

    while queue:
        current_dir, current_spec = queue.popleft()

        try:
            with os.scandir(current_dir) as entries:
                for entry in entries:
                    if count >= scan_limit:
                        return
                    try:
                        if entry.is_symlink():
                            continue

                        entry_path = Path(entry)
                        if should_exclude(entry_path, current_spec, root, include_hidden):
                            continue

                        if entry.is_dir():
                            local_spec = (
                                load_gitignore_spec(entry_path)
                                if not include_gitignored
                                else None
                            )
                            merged_spec = (
                                current_spec + local_spec
                                if current_spec and local_spec
                                else current_spec or local_spec
                            )
                            queue.append((entry_path, merged_spec))

                        count += 1
                        yield entry
                    except OSError:
                        # Entry might disappear mid-iteration,
                        # catch all OSError to avoid break the scan
                        continue

        except (PermissionError, FileNotFoundError):
            # Skip inaccessible or deleted directories
            continue

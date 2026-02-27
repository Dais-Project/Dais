import pathspec
from pathlib import Path

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

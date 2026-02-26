from pathlib import Path
from fastapi import APIRouter, Query
from ....services.exceptions import BadRequestError, NotFoundError
from ....db import DbSessionDep
from ....services.workspace import WorkspaceService
from ....schemas import task as task_schemas

context_file_router = APIRouter(tags=["context_file"])

class ContextPathError(BadRequestError):
    """Raised when the provided context path is invalid."""

    def __init__(self, message: str) -> None:
        super().__init__(message)

class ContextDirectoryNotFoundError(NotFoundError):
    """Raised when the requested context directory does not exist."""

    def __init__(self, path: str) -> None:
        super().__init__("Context directory", path)


def _list_directory(workspace_root: Path, path: str) -> list[task_schemas.ContextFileItem]:
    normalized_path = path.strip() or "."
    requested_path = Path(normalized_path)
    if requested_path.is_absolute():
        raise ContextPathError("Path must be a relative path")

    target_directory = (workspace_root / requested_path).resolve()
    try:
        target_directory.relative_to(workspace_root)
    except ValueError as error:
        raise ContextPathError("Path is outside workspace directory") from error

    if not target_directory.exists():
        raise ContextDirectoryNotFoundError(normalized_path)
    if not target_directory.is_dir():
        raise ContextPathError("Path is not a directory")

    try:
        entries = list(target_directory.iterdir())
    except PermissionError as error:
        raise ContextPathError("Permission denied for target directory") from error

    items: list[task_schemas.ContextFileItem] = []
    for entry in entries:
        if entry.name.startswith(".") or entry.is_symlink():
            continue

        if entry.is_dir():
            node_type = "folder"
        elif entry.is_file():
            node_type = "file"
        else:
            continue

        relative_path = entry.relative_to(workspace_root).as_posix()
        items.append(task_schemas.ContextFileItem(path=relative_path, name=entry.name, type=node_type))

    return sorted(items, key=lambda node: (node.type != "folder", node.name.lower()))


@context_file_router.get("/files/list", response_model=list[task_schemas.ContextFileItem])
async def list_directory(
    db_session: DbSessionDep,
    workspace_id: int = Query(...),
    path: str = Query(default="."),
):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    return _list_directory(workspace_root, path)

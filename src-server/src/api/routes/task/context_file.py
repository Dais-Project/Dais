import os
from pathlib import Path
from fastapi import APIRouter, Query
from rapidfuzz import process, fuzz, utils
from ....services.exceptions import BadRequestError, NotFoundError
from ....db import DbSessionDep
from ....services.workspace import WorkspaceService
from ....schemas import task as task_schemas
from ....utils.scandir_recursive import scandir_recursive_bfs

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

def _search_file(query: str, workspace_root: Path, match_limit: int = 32) -> list[task_schemas.ContextFileItem]:
    def weighted_path_scorer(query: str, full_path: str, *, processor=None, score_cutoff=None):
        if processor:
            query_p = processor(query)
            path_p = processor(full_path)
        else:
            query_p = query
            path_p = full_path

        filename = os.path.basename(path_p)
        dirname = os.path.dirname(path_p)
        filename_score = fuzz.WRatio(query_p, filename)
        path_score = fuzz.WRatio(query_p, dirname)
        return filename_score * 0.7 + path_score * 0.3
    
    MAX_SCAN_LIMIT = 10_000
    if len(query) <= 3:
        score_cutoff = 70
    else:
        score_cutoff = 60
    candidates: list[str] = [entry.path
                             for entry in scandir_recursive_bfs(workspace_root, MAX_SCAN_LIMIT)
                             if entry.is_file()]
    matches = process.extract(
        query,
        candidates,
        scorer=weighted_path_scorer,
        processor=utils.default_process,
        score_cutoff=score_cutoff,
        limit=match_limit
    )
    results: list[task_schemas.ContextFileItem] = []
    for _, _, index in matches:
        path = candidates[index]
        relative_path = Path(path).relative_to(workspace_root).as_posix()
        results.append(task_schemas.ContextFileItem(path=relative_path, name=Path(path).name, type="file"))
    return results

@context_file_router.get("/files/list", response_model=list[task_schemas.ContextFileItem])
async def list_directory(
    db_session: DbSessionDep,
    workspace_id: int = Query(...),
    path: str = Query(default="."),
):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    return _list_directory(workspace_root, path)

@context_file_router.get("/files/search", response_model=list[task_schemas.ContextFileItem])
async def search_file(
    db_session: DbSessionDep,
    workspace_id: int = Query(...),
    query: str = Query(...),
):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    return _search_file(query, workspace_root)

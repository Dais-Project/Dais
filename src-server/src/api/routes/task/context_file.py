import os
from pathlib import Path
from fastapi import APIRouter, Query
from pydantic import BaseModel
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

def _search_file(query: str, workspace_root: Path, match_limit: int) -> list[task_schemas.ContextFileItem]:
    def weighted_path_scorer(query, full_path, *, processor=None, score_cutoff=None):
        filename: str = os.path.basename(full_path)
        dirname: str = os.path.dirname(full_path)

        if processor:
            query = processor(query)
            filename = processor(filename)
            dirname = processor(dirname)

        filename_score = fuzz.WRatio(query, filename)
        dirname_score = fuzz.WRatio(query, dirname) if dirname else 0.0
        final_score = filename_score + dirname_score * 0.3
        if score_cutoff is not None and final_score < score_cutoff:
            return 0
        return final_score

    MAX_SCAN_LIMIT = 10_000
    candidates: list[str] = [entry.path
                             for entry in scandir_recursive_bfs(workspace_root, MAX_SCAN_LIMIT)
                             if entry.is_file()]
    matches = process.extract(
        query.strip(),
        candidates,
        scorer=weighted_path_scorer,
        processor=str.lower,
        score_cutoff=60,
        limit=match_limit
    )
    results: list[task_schemas.ContextFileItem] = []
    for _, _, index in matches:
        path = candidates[index]
        relative_path = Path(path).relative_to(workspace_root).as_posix()
        results.append(task_schemas.ContextFileItem(path=relative_path, name=Path(path).name, type="file"))
    return results

class ListDirectoryResult(BaseModel):
    items: list[task_schemas.ContextFileItem]

class SearchFileResult(BaseModel):
    items: list[task_schemas.ContextFileItem]
    total: int

@context_file_router.get("/files/list", response_model=ListDirectoryResult)
async def list_directory(
    db_session: DbSessionDep,
    workspace_id: int = Query(...),
    path: str = Query(default="."),
):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    return ListDirectoryResult(items=_list_directory(workspace_root, path))

@context_file_router.get("/files/search", response_model=SearchFileResult)
async def search_file(
    db_session: DbSessionDep,
    workspace_id: int = Query(...),
    query: str = Query(...),
    match_limit: int = Query(default=20, ge=1, le=100),
):
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    items = _search_file(query, workspace_root, match_limit)
    return SearchFileResult(items=items, total=len(items))

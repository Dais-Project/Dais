from functools import lru_cache
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Query, status
from pydantic import BaseModel
from rapidfuzz import fuzz
from src.db import DbSessionDep
from src.services.workspace import WorkspaceService
from src.schemas import task as task_schemas
from src.utils.scandir_recursive import scandir_recursive_bfs
from ...exceptions import ApiError, ApiErrorCode


context_file_router = APIRouter(tags=["context_file"])

class ContextFileInternalError(ValueError):
    def __init__(self, message: str) -> None:
        super().__init__(message)

def _list_directory(workspace_root: Path, path: str) -> list[task_schemas.ContextFileItem]:
    normalized_path = path.strip() or "."
    requested_path = Path(normalized_path)
    if requested_path.is_absolute():
        raise ContextFileInternalError("Path must be a relative path")

    target_directory = (workspace_root / requested_path).resolve()
    try:
        target_directory.relative_to(workspace_root)
    except ValueError as error:
        raise ContextFileInternalError("Path is outside workspace directory") from error

    if not target_directory.exists():
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.PATH_NOT_FOUND, f"Path not found: {normalized_path}")
    if not target_directory.is_dir():
        raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.PATH_NOT_DIRECTORY, "Path is not a directory")

    try:
        entries = list(target_directory.iterdir())
    except PermissionError:
        raise ApiError(status.HTTP_403_FORBIDDEN, ApiErrorCode.PATH_ACCESS_DENIED, "Permission denied for target directory")

    items: list[task_schemas.ContextFileItem] = []
    for entry in entries:
        if entry.name.startswith(".") or entry.is_symlink():
            continue

        if entry.is_dir():    node_type = "folder"
        elif entry.is_file(): node_type = "file"
        else: continue

        relative_path = entry.relative_to(workspace_root).as_posix()
        if node_type == "folder": relative_path += "/"
        items.append(task_schemas.ContextFileItem(path=relative_path, name=entry.name, type=node_type))

    return sorted(items, key=lambda node: (node.type != "folder", node.name.lower()))

type SearchCandidate = tuple[str, str, Literal["folder", "file"]]
@lru_cache(maxsize=8)
def _scan_cached(root: Path, scan_limit: int) -> list[SearchCandidate]:
    candidates: list[SearchCandidate] = []
    for entry in scandir_recursive_bfs(root, scan_limit):
        rel_path = Path(entry.path).relative_to(root).as_posix()
        candidates.append((entry.name, rel_path, "folder" if entry.is_dir() else "file"))
    return candidates

def _search_file(query: str, workspace_root: Path, match_limit: int) -> list[task_schemas.ContextFileItem]:
    MAX_SCAN_LIMIT = 10_000
    SCORE_CUTOFF = 60
    candidates = _scan_cached(workspace_root, MAX_SCAN_LIMIT)

    results: list[tuple[float, task_schemas.ContextFileItem]] = []
    for basename, rel_path, node_type in candidates:
        name_score = fuzz.WRatio(query, basename)
        path_score = fuzz.WRatio(query, rel_path)
        score = max(name_score, path_score)
        if score >= SCORE_CUTOFF:
            if node_type == "folder": rel_path += "/"
            results.append((score, task_schemas.ContextFileItem(path=rel_path, name=basename, type=node_type)))

    results.sort(key=lambda r: r[0], reverse=True)
    return [item for _, item in results[:match_limit]]

class ListDirectoryResult(BaseModel):
    items: list[task_schemas.ContextFileItem]

class SearchFileResult(BaseModel):
    items: list[task_schemas.ContextFileItem]
    total: int

# TODO: use to_thread
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
) -> SearchFileResult:
    workspace = await WorkspaceService(db_session).get_workspace_by_id(workspace_id)
    workspace_root = Path(workspace.directory).expanduser().resolve()
    items = _search_file(query, workspace_root, match_limit)
    return SearchFileResult(items=items, total=len(items))

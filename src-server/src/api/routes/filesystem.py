import os
from anyio import Path
from fastapi import APIRouter, Query, status
from src.schemas.filesystem import DirectoryItem, ListDirectoriesResult
from ..exceptions import ApiError, ApiErrorCode


filesystem_router = APIRouter(tags=["filesystem"])

DIRECTORY_LIST_LIMIT = 1024

async def _get_root_directories() -> list[DirectoryItem]:
    if os.name == "nt":
        items: list[DirectoryItem] = []
        for drive_code in range(ord("A"), ord("Z") + 1):
            drive = f"{chr(drive_code)}:\\"
            if await Path(drive).exists():
                items.append(DirectoryItem(path=drive, name=drive))
        return items

    return [DirectoryItem(path="/", name="/")]

async def _list_directories(path: str) -> list[DirectoryItem]:
    normalized_path = path.strip()
    try:
        if normalized_path == "":
            return await _get_root_directories()

        target_directory = await (await Path(normalized_path).expanduser()).resolve()
        path_exists = await target_directory.exists()
        if not path_exists:
            raise ApiError(
                status.HTTP_404_NOT_FOUND,
                ApiErrorCode.PATH_NOT_FOUND,
                f"Path not found: {normalized_path}",
            )

        is_directory = await target_directory.is_dir()

        if not is_directory:
            raise ApiError(
                status.HTTP_400_BAD_REQUEST,
                ApiErrorCode.PATH_NOT_DIRECTORY,
                "Path is not a directory",
            )

        items: list[DirectoryItem] = []
        async for entry in target_directory.iterdir():
            if len(items) >= DIRECTORY_LIST_LIMIT:
                break
            try:
                is_hidden = entry.name.startswith(".")
                is_symlink = await entry.is_symlink()
                is_directory = await entry.is_dir()
                if is_hidden or is_symlink or not is_directory:
                    continue
            except (OSError, PermissionError):
                continue
            items.append(DirectoryItem(path=str(entry), name=entry.name))
        return sorted(items, key=lambda item: item.name.lower())
    except PermissionError:
        raise ApiError(
            status.HTTP_403_FORBIDDEN,
            ApiErrorCode.PATH_ACCESS_DENIED,
            "Permission denied for target directory",
        )
    except OSError:
        raise ApiError(
            status.HTTP_404_NOT_FOUND,
            ApiErrorCode.PATH_NOT_FOUND,
            f"Path not found: {normalized_path}",
        )

@filesystem_router.get("/directories", response_model=ListDirectoriesResult)
async def list_directories(path: str = Query(default="")) -> ListDirectoriesResult:
    items = await _list_directories(path)
    return ListDirectoriesResult(items=items)

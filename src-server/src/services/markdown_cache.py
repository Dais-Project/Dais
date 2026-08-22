import asyncio
import hashlib
from os import PathLike

from anyio import Path
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.markdown_cache import MarkdownCacheRepository


_logger = logger.bind(name="MarkdownCacheService")


class MarkdownCacheService:
    def __init__(self,
                 repository: MarkdownCacheRepository,
                 workspace_id: int,
                 cwd: PathLike):
        self._repository = repository
        self._cwd = Path(cwd)
        self._workspace_id = workspace_id

    @classmethod
    def from_db_session(cls,
                        db_session: AsyncSession,
                        workspace_id: int,
                        cwd: PathLike) -> MarkdownCacheService:
        return cls(MarkdownCacheRepository(db_session), workspace_id, cwd)

    async def _compute_hash(self, path: Path) -> str | None:
        abs_path = self._cwd / path
        if not await abs_path.exists():
            return None
        file_bytes = await abs_path.read_bytes()
        hash_value = await asyncio.to_thread(hashlib.sha256, file_bytes)
        return hash_value.hexdigest()

    def _normalize_path(self, path: PathLike) -> Path | None:
        normalized = Path(path)
        if not normalized.is_absolute():
            return normalized
        try:
            return normalized.relative_to(self._cwd)
        except ValueError:
            return None

    async def get(self, path: PathLike) -> str | None:
        normalized = self._normalize_path(path)
        if normalized is None:
            return None
        hash_value = await self._compute_hash(normalized)
        if hash_value is None:
            return None
        cache = await self._repository.get(
            workspace_id=self._workspace_id,
            hash_value=hash_value,
            source_path=normalized.as_posix(),
        )
        return cache.content if cache is not None else None

    async def set(self, path: Path, content: str):
        normalized = self._normalize_path(path)
        if normalized is None:
            return
        hash_value = await self._compute_hash(normalized)
        if hash_value is None:
            return
        await self._repository.set(
            workspace_id=self._workspace_id,
            hash_value=hash_value,
            source_path=normalized.as_posix(),
            content=content,
        )

    async def clear_unused(self):
        to_delete = []
        for cache_id, source_path in\
            await self._repository.get_entries(self._workspace_id):
            if not await (self._cwd / source_path).exists():
                _logger.info(f"Clearing unused cache: {source_path}")
                to_delete.append(cache_id)
        await self._repository.delete_by_ids(to_delete)

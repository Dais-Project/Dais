import asyncio
import hashlib
from pathlib import Path
from loguru import logger
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import markdown_cache as markdown_cache_models
from .service_base import ServiceBase


_logger = logger.bind(name="MarkdownCacheService")

class MarkdownCacheService(ServiceBase):
    def __init__(self, db_session: AsyncSession, workspace_id: int, cwd: Path) -> None:
        super().__init__(db_session)
        self._cwd = cwd
        self._workspace_id = workspace_id

    def _compute_hash(self, path: Path) -> str | None:
        abs_path = self._cwd / path
        if not abs_path.exists(): return None
        hash = hashlib.sha256(abs_path.read_bytes())
        return hash.hexdigest()

    def _normalize_path(self, path: Path) -> Path:
        """Normalize the path to be relative to the workspace root."""
        if not path.is_absolute(): return path
        return path.relative_to(self._cwd)

    async def get(self, path: Path) -> str | None:
        path = self._normalize_path(path)
        hash = await asyncio.to_thread(self._compute_hash, path)
        if hash is None: return None

        stmt = select(markdown_cache_models.MarkdownCache).where(
            markdown_cache_models.MarkdownCache.workspace_id == self._workspace_id,
            markdown_cache_models.MarkdownCache.hash == hash,
            markdown_cache_models.MarkdownCache.source_path == path.as_posix(),
        )
        select_result = await self._db_session.scalar(stmt)
        if not select_result: return None
        return select_result.content

    async def set(self, path: Path, content: str):
        path = self._normalize_path(path)
        hash = await asyncio.to_thread(self._compute_hash, path)
        if hash is None: return None

        stmt = select(markdown_cache_models.MarkdownCache).where(
            markdown_cache_models.MarkdownCache.workspace_id == self._workspace_id,
            markdown_cache_models.MarkdownCache.hash == hash,
            markdown_cache_models.MarkdownCache.source_path == path.as_posix(),
        )
        select_result = await self._db_session.scalar(stmt)
        if select_result:
            select_result.content = content
            await self._db_session.flush()
        else:
            new_cache = markdown_cache_models.MarkdownCache(
                hash=hash,
                content=content,
                source_path=path.as_posix(),
                workspace_id=self._workspace_id,
            )
            self._db_session.add(new_cache)

    async def clear_unused(self):
        stmt = select(
            markdown_cache_models.MarkdownCache.id,
            markdown_cache_models.MarkdownCache.source_path,).where(
                markdown_cache_models.MarkdownCache.workspace_id == self._workspace_id)
        select_result = await self._db_session.execute(stmt)

        to_delete_ids: list[int] = []
        for id, source_path in select_result.tuples():
            abs_source_path = self._cwd / source_path
            source_exists = await asyncio.to_thread(abs_source_path.exists)
            if not source_exists:
                _logger.info(f"Clearing unused cache: {source_path}")
                to_delete_ids.append(id)

        if to_delete_ids:
            stmt = delete(markdown_cache_models.MarkdownCache).where(
                markdown_cache_models.MarkdownCache.id.in_(to_delete_ids))
            await self._db_session.execute(stmt)

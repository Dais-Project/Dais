from sqlalchemy import delete
from sqlalchemy import select

from src.db.models import markdown_cache as markdown_cache_models

from .repository_base import RepositoryBase


class MarkdownCacheRepository(RepositoryBase[markdown_cache_models.MarkdownCache]):
    async def get(self,
                  *,
                  workspace_id: int,
                  hash_value: str,
                  source_path: str) -> markdown_cache_models.MarkdownCache | None:
        return await self._db_session.scalar(
            select(markdown_cache_models.MarkdownCache).where(
                markdown_cache_models.MarkdownCache.workspace_id == workspace_id,
                markdown_cache_models.MarkdownCache.hash == hash_value,
                markdown_cache_models.MarkdownCache.source_path == source_path,
            )
        )

    async def set(self,
                  *,
                  workspace_id: int,
                  hash_value: str,
                  source_path: str,
                  content: str):
        cache = await self.get(
            workspace_id=workspace_id,
            hash_value=hash_value,
            source_path=source_path,
        )
        if cache is None:
            self._db_session.add(
                markdown_cache_models.MarkdownCache(
                    hash=hash_value,
                    content=content,
                    source_path=source_path,
                    workspace_id=workspace_id,
                )
            )
        else:
            cache.content = content
        await self._db_session.flush()

    async def get_entries(self, workspace_id: int) -> list[tuple[int, str]]:
        result = await self._db_session.execute(
            select(
                markdown_cache_models.MarkdownCache.id,
                markdown_cache_models.MarkdownCache.source_path,
            ).where(
                markdown_cache_models.MarkdownCache.workspace_id == workspace_id
            )
        )
        return list(result.tuples())

    async def delete_by_ids(self, cache_ids: list[int]):
        if cache_ids:
            await self._db_session.execute(
                delete(markdown_cache_models.MarkdownCache).where(
                    markdown_cache_models.MarkdownCache.id.in_(cache_ids)
                )
            )
        await self._db_session.flush()

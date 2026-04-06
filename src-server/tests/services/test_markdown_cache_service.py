from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.markdown_cache import MarkdownCache
from src.services.markdown_cache import MarkdownCacheService


class TestMarkdownCacheService:
    @pytest.mark.asyncio
    async def test_get_returns_none_when_source_file_does_not_exist(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
    ):
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        result = await service.get(Path("missing.md"))

        assert result is None

    @pytest.mark.asyncio
    async def test_set_then_get_returns_cached_content(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
    ):
        source_path = temp_workspace / "note.md"
        source_path.write_text("# Title", encoding="utf-8")
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        await service.set(Path("note.md"), "cached markdown")
        await db_session.flush()

        result = await service.get(Path("note.md"))

        assert result == "cached markdown"

    @pytest.mark.asyncio
    async def test_set_updates_existing_cache_record_instead_of_creating_duplicate(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
    ):
        source_path = temp_workspace / "note.md"
        source_path.write_text("# Title", encoding="utf-8")
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        await service.set(Path("note.md"), "cached markdown v1")
        await db_session.flush()
        await service.set(Path("note.md"), "cached markdown v2")
        await db_session.flush()

        count_stmt = select(func.count()).select_from(MarkdownCache)
        cache_count = await db_session.scalar(count_stmt)
        cache_record = await db_session.scalar(select(MarkdownCache))

        assert cache_count == 1
        assert cache_record is not None
        assert cache_record.content == "cached markdown v2"

    @pytest.mark.asyncio
    async def test_set_and_get_normalize_absolute_path_to_relative_source_path(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
    ):
        source_path = temp_workspace / "docs" / "guide.md"
        source_path.parent.mkdir()
        source_path.write_text("# Guide", encoding="utf-8")
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        await service.set(source_path, "normalized content")
        await db_session.flush()

        cache_record = await db_session.scalar(select(MarkdownCache))
        result = await service.get(source_path)

        assert cache_record is not None
        assert cache_record.source_path == "docs/guide.md"
        assert result == "normalized content"

    @pytest.mark.asyncio
    async def test_clear_unused_removes_missing_source_cache_and_keeps_existing_one(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
    ):
        existing_path = temp_workspace / "existing.md"
        existing_path.write_text("# Existing", encoding="utf-8")
        removed_path = temp_workspace / "removed.md"
        removed_path.write_text("# Removed", encoding="utf-8")
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        await service.set(Path("existing.md"), "existing cache")
        await service.set(Path("removed.md"), "removed cache")
        await db_session.flush()
        removed_path.unlink()

        await service.clear_unused()
        await db_session.flush()

        caches = (await db_session.scalars(select(MarkdownCache).order_by(MarkdownCache.source_path))).all()

        assert [cache.source_path for cache in caches] == ["existing.md"]
        assert [cache.content for cache in caches] == ["existing cache"]

    @pytest.mark.asyncio
    async def test_get_and_set_ignore_absolute_path_outside_workspace(
        self,
        db_session: AsyncSession,
        temp_workspace: Path,
        tmp_path: Path,
    ):
        outside_file = tmp_path / "outside.md"
        outside_file.write_text("# Outside", encoding="utf-8")
        service = MarkdownCacheService(db_session, workspace_id=1, cwd=temp_workspace)

        await service.set(outside_file, "outside content")
        await db_session.flush()

        count_stmt = select(func.count()).select_from(MarkdownCache)
        cache_count = await db_session.scalar(count_stmt)
        result = await service.get(outside_file)

        assert cache_count == 0
        assert result is None

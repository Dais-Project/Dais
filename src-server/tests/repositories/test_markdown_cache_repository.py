import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.markdown_cache import MarkdownCacheRepository


@pytest.fixture
def markdown_cache_repository(
    db_session: AsyncSession,
) -> MarkdownCacheRepository:
    return MarkdownCacheRepository(db_session)


@pytest.mark.integration
class TestMarkdownCacheRepository:
    @pytest.mark.asyncio
    async def test_set_updates_existing_cache_without_duplicate(
        self,
        markdown_cache_repository: MarkdownCacheRepository,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")

        await markdown_cache_repository.set(
            workspace_id=workspace.id,
            hash_value="hash",
            source_path="note.md",
            content="v1",
        )
        await markdown_cache_repository.set(
            workspace_id=workspace.id,
            hash_value="hash",
            source_path="note.md",
            content="v2",
        )
        entries = await markdown_cache_repository.get_entries(workspace.id)
        cache = await markdown_cache_repository.get(
            workspace_id=workspace.id,
            hash_value="hash",
            source_path="note.md",
        )

        assert len(entries) == 1
        assert cache is not None
        assert cache.content == "v2"

    @pytest.mark.asyncio
    async def test_delete_by_ids_removes_only_selected_entries(
        self,
        markdown_cache_repository: MarkdownCacheRepository,
        workspace_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        await markdown_cache_repository.set(
            workspace_id=workspace.id,
            hash_value="hash-a",
            source_path="a.md",
            content="A",
        )
        await markdown_cache_repository.set(
            workspace_id=workspace.id,
            hash_value="hash-b",
            source_path="b.md",
            content="B",
        )
        entries = await markdown_cache_repository.get_entries(workspace.id)

        await markdown_cache_repository.delete_by_ids([entries[0][0]])

        remaining = await markdown_cache_repository.get_entries(workspace.id)
        assert remaining == [entries[1]]

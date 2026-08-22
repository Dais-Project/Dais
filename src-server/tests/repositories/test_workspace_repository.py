import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.workspace import WorkspaceRepository


@pytest.fixture
def workspace_repository(db_session: AsyncSession) -> WorkspaceRepository:
    return WorkspaceRepository(db_session)


@pytest.mark.integration
class TestWorkspaceRepository:
    @pytest.mark.asyncio
    async def test_get_workspaces_query_filters_by_name_or_directory(
        self,
        workspace_repository: WorkspaceRepository,
        db_session: AsyncSession,
        workspace_factory,
    ):
        name_match = await workspace_factory(
            name="Release Workspace",
            directory="/tmp/general",
        )
        directory_match = await workspace_factory(
            name="General",
            directory="/tmp/release-notes",
        )
        await workspace_factory(name="Other", directory="/tmp/other")

        rows = await db_session.scalars(
            workspace_repository.get_workspaces_query("release")
        )

        assert [workspace.id for workspace in rows.unique().all()] == [
            name_match.id,
            directory_match.id,
        ]

    @pytest.mark.asyncio
    async def test_get_frequent_counts_only_recent_tasks(
        self,
        workspace_repository: WorkspaceRepository,
        db_session: AsyncSession,
        workspace_factory,
        task_factory,
    ):
        workspace_a = await workspace_factory(name="Workspace A")
        workspace_b = await workspace_factory(name="Workspace B")
        workspace_c = await workspace_factory(name="Workspace C")
        workspace_d = await workspace_factory(name="Workspace D")

        await task_factory(workspace=workspace_a, title="Task A1")
        await task_factory(workspace=workspace_b, title="Task B1")
        await task_factory(workspace=workspace_a, title="Task A2")
        await task_factory(workspace=workspace_c, title="Task C1")
        await task_factory(workspace=workspace_b, title="Task B2")
        await task_factory(workspace=workspace_c, title="Task C2")
        await task_factory(workspace=workspace_d, title="Task D1")
        await task_factory(workspace=workspace_b, title="Task B3")
        await db_session.flush()

        workspaces = await workspace_repository.get_frequent(
            limit=3,
            recent_task_limit=5,
        )

        assert [workspace.id for workspace in workspaces] == [
            workspace_b.id,
            workspace_c.id,
            workspace_d.id,
        ]

    @pytest.mark.asyncio
    async def test_get_frequent_uses_workspace_id_as_tiebreaker(
        self,
        workspace_repository: WorkspaceRepository,
        db_session: AsyncSession,
        workspace_factory,
        task_factory,
    ):
        workspace_a = await workspace_factory(name="Workspace A")
        workspace_b = await workspace_factory(name="Workspace B")
        workspace_c = await workspace_factory(name="Workspace C")

        await task_factory(workspace=workspace_c, title="Task C1")
        await task_factory(workspace=workspace_a, title="Task A1")
        await task_factory(workspace=workspace_b, title="Task B1")
        await task_factory(workspace=workspace_c, title="Task C2")
        await task_factory(workspace=workspace_b, title="Task B2")
        await task_factory(workspace=workspace_a, title="Task A2")
        await db_session.flush()

        workspaces = await workspace_repository.get_frequent(
            limit=2,
            recent_task_limit=10,
        )

        assert [workspace.id for workspace in workspaces] == [
            workspace_a.id,
            workspace_b.id,
        ]

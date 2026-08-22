import time

import pytest
from dais_sdk.types import UserMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.tasks.task import TaskRepository
from src.schemas.tasks import task as task_schemas


@pytest.fixture
def task_repository(db_session: AsyncSession) -> TaskRepository:
    return TaskRepository(db_session)


@pytest.mark.integration
class TestTaskRepository:
    @pytest.mark.asyncio
    async def test_get_query_filters_by_title(
        self,
        task_repository: TaskRepository,
        db_session: AsyncSession,
        workspace_factory,
        task_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        matching = await task_factory(
            workspace=workspace,
            title="Release Checklist",
        )
        await task_factory(workspace=workspace, title="Daily notes")

        rows = await db_session.scalars(
            task_repository.get_query(workspace.id, "release")
        )

        assert [task.id for task in rows.all()] == [matching.id]

    @pytest.mark.asyncio
    async def test_create_update_and_delete_task(
        self,
        task_repository: TaskRepository,
        workspace_factory,
        agent_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        agent = await agent_factory(name="Agent A")

        created = await task_repository.create(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )
        updated = await task_repository.update(
            created,
            task_schemas.TaskUpdate(
                title="Task B",
                messages=[UserMessage(content="Updated")],
                agent_id=agent.id,
                last_run_at=int(time.time()),
                usage=None,
            ),
        )

        assert updated.title == "Task B"
        assert updated.messages[0].content == "Updated"

        await task_repository.delete(updated)

        assert await task_repository.get_by_id(updated.id) is None

    @pytest.mark.asyncio
    async def test_get_ids_before_returns_only_expired_tasks(
        self,
        task_repository: TaskRepository,
        workspace_factory,
        task_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        expired = await task_factory(workspace=workspace, title="Expired")
        retained = await task_factory(workspace=workspace, title="Retained")
        expired.last_run_at = 100
        retained.last_run_at = 300
        await task_repository._db_session.flush()

        ids = await task_repository.get_ids_before(200)

        assert ids == [expired.id]

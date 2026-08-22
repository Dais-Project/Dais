import pytest
from dais_sdk.types import UserMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import tasks as task_models
from src.repositories.tasks.subtask import SubtaskRepository
from src.schemas.tasks import subtask as subtask_schemas


@pytest.fixture
def subtask_repository(db_session: AsyncSession) -> SubtaskRepository:
    return SubtaskRepository(db_session)


@pytest.mark.integration
class TestSubtaskRepository:
    @pytest.mark.asyncio
    async def test_create_update_and_load_subtask_relations(
        self,
        subtask_repository: SubtaskRepository,
        db_session: AsyncSession,
        workspace_factory,
        task_factory,
        agent_factory,
    ):
        workspace = await workspace_factory(name="Workspace A")
        agent = await agent_factory(name="Agent A")
        task = await task_factory(workspace=workspace, agent=agent)

        created = await subtask_repository.create(
            subtask_schemas.SubtaskCreate(
                instruction="Do work",
                task_id=task.id,
                agent_id=agent.id,
            )
        )
        updated = await subtask_repository.update(
            created,
            subtask_schemas.SubtaskUpdate(
                messages=[UserMessage(content="Updated")],
            ),
        )
        db_session.expunge_all()

        loaded = await subtask_repository.get_by_id(updated.id)

        assert loaded is not None
        assert loaded.task.id == task.id
        assert loaded.agent is not None
        assert loaded.agent.id == agent.id
        assert loaded.messages[0].content == "Updated"

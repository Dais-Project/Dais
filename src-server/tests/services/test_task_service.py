import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.types import UserMessage

from src.db.models import task as task_models
from src.db.models import workspace as workspace_models
from src.schemas import task as task_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.task import TaskNotFoundError, TaskService


@pytest.mark.service
@pytest.mark.integration
class TestTaskService:
    @pytest.mark.asyncio
    async def test_get_task_by_id_not_found(self, db_session: AsyncSession):
        service = TaskService(db_session)

        with pytest.raises(TaskNotFoundError) as exc_info:
            await service.get_task_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.TASK_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_task_with_messages(self, db_session: AsyncSession, seeded_data):
        workspace = workspace_models.Workspace(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[seeded_data.agent],
            usable_tools=[seeded_data.tool],
        )
        db_session.add(workspace)
        await db_session.flush()

        service = TaskService(db_session)
        data = task_schemas.TaskCreate(
            title="Task A",
            messages=[UserMessage(content="Hello")],
            agent_id=seeded_data.agent.id,
            workspace_id=workspace.id,
        )

        task = await service.create_task(data)

        assert task.title == "Task A"
        assert task.workspace_id == workspace.id
        assert task.agent_id == seeded_data.agent.id
        assert len(task.messages) == 1
        assert task.messages[0].content == "Hello"

    @pytest.mark.asyncio
    async def test_update_task_updates_messages_and_fields(self, db_session: AsyncSession, seeded_data):
        workspace = workspace_models.Workspace(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[seeded_data.agent],
            usable_tools=[seeded_data.tool],
        )
        db_session.add(workspace)
        await db_session.flush()

        service = TaskService(db_session)
        created = await service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                messages=[UserMessage(content="Hello")],
                agent_id=seeded_data.agent.id,
                workspace_id=workspace.id,
            )
        )
        updated_usage = task_models.TaskUsage(
            input_tokens=1,
            output_tokens=2,
            total_tokens=3,
            max_tokens=4,
            accumulated_input_tokens=5,
            accumulated_output_tokens=6,
        )

        updated = await service.update_task(
            created.id,
            task_schemas.TaskUpdate(
                title="Task B",
                usage=updated_usage,
                last_run_at=123456,
                agent_id=None,
                messages=[UserMessage(content="Updated")],
            ),
        )

        assert updated.title == "Task B"
        assert updated.last_run_at == 123456
        assert updated.agent_id is seeded_data.agent.id
        assert updated.usage == updated_usage
        assert len(updated.messages) == 1
        assert updated.messages[0].content == "Updated"

    @pytest.mark.asyncio
    async def test_delete_task_removes_entity(self, db_session: AsyncSession, seeded_data):
        workspace = workspace_models.Workspace(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[seeded_data.agent],
            usable_tools=[seeded_data.tool],
        )
        db_session.add(workspace)
        await db_session.flush()

        service = TaskService(db_session)
        task = await service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                messages=[UserMessage(content="Hello")],
                agent_id=seeded_data.agent.id,
                workspace_id=workspace.id,
            )
        )

        await service.delete_task(task.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(TaskNotFoundError):
            await service.get_task_by_id(task.id)

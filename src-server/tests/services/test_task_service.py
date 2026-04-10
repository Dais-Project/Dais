import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.types import UserMessage

from src.db.models import task as task_models
from src.schemas import task as task_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.task import TaskNotFoundError, TaskService


@pytest.fixture
def task_service(db_session: AsyncSession) -> TaskService:
    return TaskService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestTaskService:
    @pytest.mark.asyncio
    async def test_get_task_by_id_not_found(self, task_service: TaskService):
        with pytest.raises(TaskNotFoundError, match="Task '999' not found") as exc_info:
            await task_service.get_task_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.TASK_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_task(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        tool_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_factory(name="Agent A", usable_tools=[tool])
        workspace = await workspace_factory(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[agent],
            usable_tools=[tool],
        )

        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )

        assert task.title == "Task A"
        assert task.workspace_id == workspace.id
        assert task.agent_id == agent.id
        assert task.messages == []

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "title,last_run_at,messages",
        [
            ("Task B", 123456, [UserMessage(content="Updated once")]),
            ("Task C", 654321, [UserMessage(content="Updated twice")]),
        ],
        ids=["single-message-update", "alternate-update-values"],
    )
    async def test_update_task_updates_messages_and_fields(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        tool_factory,
        title: str,
        last_run_at: int,
        messages: list[UserMessage],
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_factory(name="Agent A", usable_tools=[tool])
        workspace = await workspace_factory(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[agent],
            usable_tools=[tool],
        )
        created = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
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

        updated = await task_service.update_task(
            created.id,
            task_schemas.TaskUpdate(
                title=title,
                usage=updated_usage,
                last_run_at=last_run_at,
                agent_id=None,
                messages=messages,
            ),
        )

        assert updated.title == title
        assert updated.last_run_at == last_run_at
        assert updated.agent_id == agent.id
        assert updated.usage == updated_usage
        assert [message.content for message in updated.messages] == [message.content for message in messages]

    @pytest.mark.asyncio
    async def test_delete_task_removes_entity(
        self,
        task_service: TaskService,
        db_session: AsyncSession,
        workspace_factory,
        agent_factory,
        tool_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_factory(name="Agent A", usable_tools=[tool])
        workspace = await workspace_factory(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agents=[agent],
            usable_tools=[tool],
        )
        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )

        await task_service.delete_task(task.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(TaskNotFoundError, match=f"Task '{task.id}' not found"):
            await task_service.get_task_by_id(task.id)

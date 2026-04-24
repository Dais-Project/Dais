from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dais_sdk.types import UserMessage

from src.db.models import task as task_models
from src.schemas.tasks import task as task_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.task import TaskNotFoundError, TaskService


@pytest.fixture
def task_service(db_session: AsyncSession) -> TaskService:
    return TaskService(db_session)


@pytest.fixture
def task_resource_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path / "task-data"
    monkeypatch.setattr("src.services.task.DATA_DIR", data_dir)
    return data_dir


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
    async def test_save_task_resource_creates_db_record_and_file(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        task_resource_data_dir: Path,
    ):
        agent = await agent_factory(name="Agent A")
        workspace = await workspace_factory(name="Workspace A")
        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )
        file_bytes = b"task resource content"

        resource = await task_service.save_task_resource(task.id, "note.txt", file_bytes)
        resource_path = task_resource_data_dir / ".task-resources" / str(task.id) / resource.filename

        assert resource.id is not None
        assert resource.filename.endswith(".txt")
        assert resource.filename != "note.txt"
        assert resource.checksum is not None
        assert resource_path.exists()
        assert resource_path.read_bytes() == file_bytes

    @pytest.mark.asyncio
    async def test_save_task_resource_reuses_existing_record_for_same_checksum(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        task_resource_data_dir: Path,
    ):
        agent = await agent_factory(name="Agent A")
        workspace = await workspace_factory(name="Workspace A")
        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )
        file_bytes = b"same-content"

        first_resource = await task_service.save_task_resource(task.id, "note.txt", file_bytes)
        second_resource = await task_service.save_task_resource(task.id, "other-name.txt", file_bytes)
        resource_dir = task_resource_data_dir / ".task-resources" / str(task.id)
        stored_files = sorted(path.name for path in resource_dir.iterdir())

        assert second_resource.id == first_resource.id
        assert second_resource.filename == first_resource.filename
        assert stored_files == [first_resource.filename]

    @pytest.mark.asyncio
    async def test_load_task_resource_returns_saved_path(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        task_resource_data_dir: Path,
    ):
        agent = await agent_factory(name="Agent A")
        workspace = await workspace_factory(name="Workspace A")
        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )
        resource = await task_service.save_task_resource(task.id, "note.txt", b"resource-bytes")

        resource_path = await task_service.load_task_resource(task.id, resource.id)

        assert resource_path == task_resource_data_dir / ".task-resources" / str(task.id) / resource.filename

    @pytest.mark.asyncio
    async def test_load_task_resource_returns_none_when_record_or_file_missing(
        self,
        task_service: TaskService,
        workspace_factory,
        agent_factory,
        task_resource_data_dir: Path,
    ):
        agent = await agent_factory(name="Agent A")
        workspace = await workspace_factory(name="Workspace A")
        task = await task_service.create_task(
            task_schemas.TaskCreate(
                title="Task A",
                agent_id=agent.id,
                workspace_id=workspace.id,
            )
        )
        resource = await task_service.save_task_resource(task.id, "note.txt", b"resource-bytes")
        resource_path = task_resource_data_dir / ".task-resources" / str(task.id) / resource.filename
        resource_path.unlink()

        missing_record_result = await task_service.load_task_resource(task.id, 999)
        missing_file_result = await task_service.load_task_resource(task.id, resource.id)

        assert missing_record_result is None
        assert missing_file_result is None

    @pytest.mark.asyncio
    async def test_delete_task_removes_entity_and_task_resources(
        self,
        task_service: TaskService,
        db_session: AsyncSession,
        workspace_factory,
        agent_factory,
        tool_factory,
        task_resource_data_dir: Path,
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
        resource = await task_service.save_task_resource(task.id, "note.txt", b"resource-bytes")
        resource_dir = task_resource_data_dir / ".task-resources" / str(task.id)
        resource_path = resource_dir / resource.filename

        await task_service.delete_task(task.id)
        await db_session.flush()
        db_session.expunge_all()

        assert not resource_path.exists()
        assert not resource_dir.exists()
        with pytest.raises(TaskNotFoundError, match=f"Task '{task.id}' not found"):
            await task_service.get_task_by_id(task.id)

        resource_in_db = await db_session.scalar(
            select(task_models.TaskResource).where(task_models.TaskResource.id == resource.id)
        )
        assert resource_in_db is None

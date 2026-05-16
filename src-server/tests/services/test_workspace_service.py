from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.notes import NoteMaterializer
from src.db.models.markdown_cache import MarkdownCache
from src.db.models import agent as agent_models
from src.db.models import tasks as task_models
from src.db.models.tasks.schedule import DelayedConfig
from src.db.models import workspace as workspace_models
from src.schemas import workspace as workspace_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.workspace import WorkspaceNotFoundError, WorkspaceService


@pytest.fixture
def workspace_service(db_session: AsyncSession) -> WorkspaceService:
    return WorkspaceService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestWorkspaceService:
    @pytest.mark.asyncio
    async def test_get_workspace_by_id_not_found(self, workspace_service: WorkspaceService):
        with pytest.raises(WorkspaceNotFoundError, match="Workspace '999' not found") as exc_info:
            await workspace_service.get_workspace_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.WORKSPACE_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_workspace_with_relations(
        self,
        workspace_service: WorkspaceService,
        agent_factory,
        tool_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_factory(name="Agent A", usable_tools=[tool])

        workspace = await workspace_service.create_workspace(
            workspace_schemas.WorkspaceCreate(
                name="Workspace A",
                directory="/tmp/workspace-a",
                instruction="Instruction A",
                notes=[],
                usable_agent_ids=[agent.id],
                usable_tool_ids=[tool.id],
                usable_skill_ids=[],
            )
        )

        assert workspace.name == "Workspace A"
        assert workspace.directory == "/tmp/workspace-a"
        assert workspace.instruction == "Instruction A"
        assert {a.id for a in workspace.usable_agents} == {agent.id}
        assert {t.id for t in workspace.usable_tools} == {tool.id}

    @pytest.mark.asyncio
    async def test_update_workspace_updates_fields_and_relations(
        self,
        workspace_service: WorkspaceService,
        agent_factory,
        tool_factory,
    ):
        initial_tool = await tool_factory(name="Echo", internal_key="echo")
        initial_agent = await agent_factory(name="Agent A", usable_tools=[initial_tool])
        initial = await workspace_service.create_workspace(
            workspace_schemas.WorkspaceCreate(
                name="Workspace A",
                directory="/tmp/workspace-a",
                instruction="Instruction A",
                notes=[],
                usable_agent_ids=[initial_agent.id],
                usable_tool_ids=[initial_tool.id],
                usable_skill_ids=[],
            )
        )

        new_tool = await tool_factory(name="Echo 2", internal_key="echo-2")
        new_agent = await agent_factory(name="Agent B", usable_tools=[new_tool])

        updated = await workspace_service.update_workspace(
            initial.id,
            workspace_schemas.WorkspaceUpdate(
                name="Workspace B",
                directory="/tmp/workspace-b",
                instruction="Instruction B",
                notes=[],
                usable_agent_ids=[new_agent.id],
                usable_tool_ids=[new_tool.id],
                usable_skill_ids=[],
            ),
        )

        assert updated.name == "Workspace B"
        assert updated.directory == "/tmp/workspace-b"
        assert updated.instruction == "Instruction B"
        assert {a.id for a in updated.usable_agents} == {new_agent.id}
        assert {t.id for t in updated.usable_tools} == {new_tool.id}

    @pytest.mark.asyncio
    async def test_get_frequent_workspaces_counts_recent_tasks(
        self,
        workspace_service: WorkspaceService,
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

        frequent_workspaces = await workspace_service.get_frequent_workspaces(
            limit=3,
            recent_task_limit=5,
        )

        assert [workspace.id for workspace in frequent_workspaces] == [
            workspace_b.id,
            workspace_c.id,
            workspace_d.id,
        ]

    @pytest.mark.asyncio
    async def test_get_frequent_workspaces_respects_limit_and_tiebreaker(
        self,
        workspace_service: WorkspaceService,
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

        frequent_workspaces = await workspace_service.get_frequent_workspaces(
            limit=2,
            recent_task_limit=10,
        )

        assert [workspace.id for workspace in frequent_workspaces] == [
            workspace_a.id,
            workspace_b.id,
        ]

    @pytest.mark.asyncio
    async def test_delete_workspace_removes_entity_and_cascade_children(
        self,
        workspace_service: WorkspaceService,
        db_session: AsyncSession,
        agent_factory,
        tool_factory,
        task_factory,
    ):
        tool = await tool_factory(name="Echo", internal_key="echo")
        agent = await agent_factory(name="Agent A", usable_tools=[tool])
        workspace = await workspace_service.create_workspace(
            workspace_schemas.WorkspaceCreate(
                name="Workspace A",
                directory="/tmp/workspace-a",
                instruction="Instruction A",
                notes=[
                    workspace_schemas.WorkspaceNoteBase(
                        relative="note.md",
                        content="persisted-note",
                    )
                ],
                usable_agent_ids=[agent.id],
                usable_tool_ids=[tool.id],
                usable_skill_ids=[],
            )
        )
        note_id = workspace.notes[0].id
        task = await task_factory(workspace=workspace, title="Task A", agent=agent)
        schedule = task_models.Schedule(
            name="Daily sync",
            task="Send sync",
            is_enabled=True,
            config=DelayedConfig(type="delayed", scheduled_at=999999),
            agent_id=agent.id,
            _workspace_id=workspace.id,
        )
        db_session.add(schedule)
        cache = MarkdownCache(
            hash="cache-hash",
            content="cached markdown",
            source_path="note.md",
            workspace_id=workspace.id,
        )
        db_session.add(cache)
        await db_session.flush()
        schedule_id = schedule.id

        await workspace_service.delete_workspace(workspace.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(WorkspaceNotFoundError, match=f"Workspace '{workspace.id}' not found"):
            await workspace_service.get_workspace_by_id(workspace.id)

        note_in_db = await db_session.scalar(
            select(workspace_models.WorkspaceNote).where(workspace_models.WorkspaceNote.id == note_id)
        )
        task_in_db = await db_session.scalar(select(task_models.Task).where(task_models.Task.id == task.id))
        schedule_in_db = await db_session.scalar(
            select(task_models.Schedule).where(task_models.Schedule.id == schedule_id)
        )
        cache_in_db = await db_session.scalar(
            select(MarkdownCache).where(MarkdownCache.id == cache.id)
        )

        assert note_in_db is None
        assert task_in_db is None
        assert schedule_in_db is None
        assert cache_in_db is None

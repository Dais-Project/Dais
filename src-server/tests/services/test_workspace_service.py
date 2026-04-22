from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.notes.manager import NoteManager
from src.db.models.markdown_cache import MarkdownCache
from src.db.models.task import Task
from src.db.models.workspace import WorkspaceNote
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
        cache = MarkdownCache(
            hash="cache-hash",
            content="cached markdown",
            source_path="note.md",
            workspace_id=workspace.id,
        )
        db_session.add(cache)
        await db_session.flush()

        note_manager = NoteManager(workspace.id)
        notes_dir = await note_manager.get_notes_dir()
        note_path = Path(str(notes_dir)) / "note.md"
        note_path.write_text("persisted", encoding="utf-8")

        await workspace_service.delete_workspace(workspace.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(WorkspaceNotFoundError, match=f"Workspace '{workspace.id}' not found"):
            await workspace_service.get_workspace_by_id(workspace.id)
        assert not note_path.exists()

        note_in_db = await db_session.scalar(
            select(WorkspaceNote).where(WorkspaceNote.id == note_id)
        )
        task_in_db = await db_session.scalar(select(Task).where(Task.id == task.id))
        cache_in_db = await db_session.scalar(
            select(MarkdownCache).where(MarkdownCache.id == cache.id)
        )

        assert note_in_db is None
        assert task_in_db is None
        assert cache_in_db is None

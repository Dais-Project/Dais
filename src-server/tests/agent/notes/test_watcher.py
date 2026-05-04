import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anyio import Path as AnyioPath
from watchfiles import Change as ChangeType

from src.agent.notes import NoteWatcher
from src.db.models import workspace as workspace_models


@pytest.mark.integration
class TestNoteWatcher:
    @pytest.mark.asyncio
    async def test_start_watching_creates_watch_task(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        watcher = NoteWatcher(workspace_id=1)

        async def fake_watch_files(notes_dir: AnyioPath, stop_event: asyncio.Event):
            await stop_event.wait()

        with patch.object(watcher, "_watch_files", fake_watch_files):
            await watcher.start_watching()

            assert watcher._watch_task is not None
            assert not watcher._watch_task.done()

            with pytest.raises(asyncio.CancelledError):
                await watcher.stop_watching()
            assert watcher._watch_task is None

    @pytest.mark.asyncio
    async def test_start_watching_restarts_existing_watch(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        watcher = NoteWatcher(workspace_id=1)

        async def fake_watch_files(notes_dir: AnyioPath, stop_event: asyncio.Event):
            await stop_event.wait()

        with patch.object(watcher, "_watch_files", fake_watch_files):
            await watcher.start_watching()
            first_task = watcher._watch_task

            with pytest.raises(asyncio.CancelledError):
                await watcher.start_watching()

            assert watcher._watch_task is None or watcher._watch_task is not first_task

    @pytest.mark.asyncio
    async def test_stop_watching_handles_already_stopped_state(self):
        watcher = NoteWatcher(workspace_id=1)

        await watcher.stop_watching()

        assert watcher._watch_task is None

    @pytest.mark.asyncio
    async def test_handle_file_changes_adds_updates_and_deletes_notes(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        base = AnyioPath(tmp_path / "notes")
        await base.mkdir(parents=True, exist_ok=True)

        added_path = base / "new.md"
        updated_path = base / "existing.md"
        deleted_path = base / "deleted.md"
        await added_path.write_text("New content", "utf-8")
        await updated_path.write_text("Updated content", "utf-8")

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = [
            workspace_models.WorkspaceNote(relative="existing.md", content="Old content"),
            workspace_models.WorkspaceNote(relative="deleted.md", content="Delete me"),
        ]

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch("src.services.workspace.WorkspaceService", return_value=mock_service):
            with patch("src.agent.notes.watcher.db_context") as mock_db_context:
                mock_db_context.return_value.__aenter__ = AsyncMock(return_value=AsyncMock())
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)
                await watcher._handle_file_changes(base, [
                    (ChangeType.added, added_path),
                    (ChangeType.modified, updated_path),
                    (ChangeType.deleted, deleted_path),
                ])

        notes_by_relative = {note.relative: note.content for note in workspace.notes}
        assert notes_by_relative == {
            "existing.md": "Updated content",
            "new.md": "New content",
        }

    @pytest.mark.asyncio
    async def test_handle_file_changes_ignores_empty_changes(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        base = AnyioPath(tmp_path / "notes")
        await base.mkdir(parents=True, exist_ok=True)

        await watcher._handle_file_changes(base, [])

    @pytest.mark.asyncio
    async def test_handle_file_changes_skips_file_read_errors(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        base = AnyioPath(tmp_path / "notes")
        await base.mkdir(parents=True, exist_ok=True)

        missing_path = base / "missing.md"
        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = []

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch("src.services.workspace.WorkspaceService", return_value=mock_service):
            with patch("src.agent.notes.watcher.db_context") as mock_db_context:
                mock_db_context.return_value.__aenter__ = AsyncMock(return_value=AsyncMock())
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)
                await watcher._handle_file_changes(base, [(ChangeType.added, missing_path)])

        assert workspace.notes == []

    @pytest.mark.asyncio
    async def test_watch_files_filters_only_markdown_files(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        notes_dir = AnyioPath(tmp_path / "notes")
        await notes_dir.mkdir(parents=True, exist_ok=True)

        md_file = Path(str(notes_dir / "note.md"))
        txt_file = Path(str(notes_dir / "note.txt"))
        subdir = Path(str(notes_dir / "dir"))
        md_file.write_text("# Note", encoding="utf-8")
        txt_file.write_text("plain text", encoding="utf-8")
        subdir.mkdir()

        stop_event = asyncio.Event()

        async def fake_awatch(*args, **kwargs):
            yield {
                (ChangeType.added, str(md_file)),
                (ChangeType.added, str(txt_file)),
                (ChangeType.added, str(subdir)),
            }
            stop_event.set()

        with patch("src.agent.notes.watcher.awatch", fake_awatch):
            with patch.object(watcher, "_handle_file_changes", AsyncMock()) as handle_mock:
                await watcher._watch_files(notes_dir, stop_event)

        handle_mock.assert_awaited_once()
        forwarded_changes = handle_mock.await_args.args[1]
        assert len(forwarded_changes) == 1
        change_type, path = forwarded_changes[0]
        assert change_type == ChangeType.added
        assert path.name == "note.md"

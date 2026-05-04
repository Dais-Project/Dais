from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anyio import Path as AnyioPath
from watchfiles import Change as ChangeType

from src.agent.notes.watcher import NoteWatcher
from src.agent.notes.workspace_ref_manager import WorkspaceRefManager
from src.db.models import workspace as workspace_models
from src.utils.directory_watcher import DirectoryWatcher


@pytest.mark.integration
class TestNoteWatcher:
    @pytest.mark.asyncio
    async def test_start_creates_directory_watcher(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        watcher = NoteWatcher(workspace_id=1)
        directory_watcher = AsyncMock(spec=DirectoryWatcher)

        with patch(
            "src.agent.notes.watcher.DirectoryWatcher",
            return_value=directory_watcher,
        ) as directory_watcher_cls:
            await watcher._start()

        assert watcher._watcher is directory_watcher
        assert WorkspaceRefManager.is_workspace_in_use(1)
        directory_watcher_cls.assert_called_once()
        directory_watcher.start.assert_awaited_once()

        await watcher._stop()
        directory_watcher.stop.assert_awaited_once()
        assert watcher._watcher is None
        assert not WorkspaceRefManager.is_workspace_in_use(1)

    @pytest.mark.asyncio
    async def test_start_restarts_existing_directory_watcher(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        watcher = NoteWatcher(workspace_id=1)
        first_directory_watcher = AsyncMock(spec=DirectoryWatcher)
        second_directory_watcher = AsyncMock(spec=DirectoryWatcher)

        with patch(
            "src.agent.notes.watcher.DirectoryWatcher",
            side_effect=[first_directory_watcher, second_directory_watcher],
        ):
            await watcher._start()
            await watcher._start()

        first_directory_watcher.start.assert_awaited_once()
        first_directory_watcher.stop.assert_awaited_once()
        second_directory_watcher.start.assert_awaited_once()
        assert watcher._watcher is second_directory_watcher
        assert WorkspaceRefManager.is_workspace_in_use(1)

        await watcher._stop()
        second_directory_watcher.stop.assert_awaited_once()
        assert not WorkspaceRefManager.is_workspace_in_use(1)

    @pytest.mark.asyncio
    async def test_stop_handles_already_stopped_state(self):
        watcher = NoteWatcher(workspace_id=1)

        await watcher._stop()

        assert watcher._watcher is None
        assert not WorkspaceRefManager.is_workspace_in_use(1)

    @pytest.mark.asyncio
    async def test_start_rolls_back_workspace_ref_when_directory_watcher_start_fails(
        self,
        tmp_path: Path,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        watcher = NoteWatcher(workspace_id=1)
        directory_watcher = AsyncMock(spec=DirectoryWatcher)
        directory_watcher.start.side_effect = RuntimeError("boom")

        with patch("src.agent.notes.watcher.DirectoryWatcher", return_value=directory_watcher):
            with pytest.raises(RuntimeError, match="boom"):
                await watcher._start()

        assert not WorkspaceRefManager.is_workspace_in_use(1)

    @pytest.mark.asyncio
    async def test_handle_file_changes_filters_and_forwards_markdown_only(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        notes_dir = AnyioPath(tmp_path / "notes")
        await notes_dir.mkdir(parents=True, exist_ok=True)

        md_file = notes_dir / "note.md"
        txt_file = notes_dir / "note.txt"
        subdir = notes_dir / "dir"
        await md_file.write_text("# Note", "utf-8")
        await txt_file.write_text("plain text", "utf-8")
        await subdir.mkdir()

        with patch(
            "src.agent.notes.watcher.NoteMaterializer.get_notes_dir",
            AsyncMock(return_value=notes_dir),
        ):
            with patch.object(watcher, "_handle_note_changes", AsyncMock()) as handle_mock:
                await watcher._handle_file_changes(
                    [
                        (ChangeType.added, str(md_file)),
                        (ChangeType.added, str(txt_file)),
                        (ChangeType.added, str(subdir)),
                    ]
                )

        handle_mock.assert_awaited_once()
        forwarded_base, forwarded_changes = handle_mock.await_args.args
        assert forwarded_base == notes_dir
        assert len(forwarded_changes) == 1
        change_type, path = forwarded_changes[0]
        assert change_type == ChangeType.added
        assert path == md_file

    @pytest.mark.asyncio
    async def test_handle_file_changes_ignores_empty_changes(self, tmp_path: Path):
        watcher = NoteWatcher(workspace_id=1)
        notes_dir = AnyioPath(tmp_path / "notes")
        await notes_dir.mkdir(parents=True, exist_ok=True)

        with patch(
            "src.agent.notes.watcher.NoteMaterializer.get_notes_dir",
            AsyncMock(return_value=notes_dir),
        ):
            with patch.object(watcher, "_handle_note_changes", AsyncMock()) as handle_mock:
                await watcher._handle_file_changes([])

        handle_mock.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_handle_note_changes_adds_updates_and_deletes_notes(self, tmp_path: Path):
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
                await watcher._handle_note_changes(
                    base,
                    [
                        (ChangeType.added, added_path),
                        (ChangeType.modified, updated_path),
                        (ChangeType.deleted, deleted_path),
                    ],
                )

        notes_by_relative = {note.relative: note.content for note in workspace.notes}
        assert notes_by_relative == {
            "existing.md": "Updated content",
            "new.md": "New content",
        }

    @pytest.mark.asyncio
    async def test_handle_note_changes_skips_file_read_errors(self, tmp_path: Path):
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
                await watcher._handle_note_changes(base, [(ChangeType.added, missing_path)])

        assert workspace.notes == []

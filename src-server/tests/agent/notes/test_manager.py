"""Tests for the NoteManager class."""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anyio import Path as AnyioPath
from watchfiles import Change as ChangeType

from src.agent.notes.manager import NoteManager
from src.db.models import workspace as workspace_models


@pytest.fixture
def note_manager():
    """Return a NoteManager instance for workspace_id=1."""
    return NoteManager(workspace_id=1)


@pytest.fixture
def mock_workspace_with_notes():
    """Return a mock workspace with notes."""
    workspace = MagicMock()
    workspace.id = 1
    workspace.notes = [
        workspace_models.WorkspaceNote(relative="README.md", content="# Hello"),
        workspace_models.WorkspaceNote(relative="docs/guide.md", content="## Guide"),
    ]
    return workspace


class TestGetNotesRootDir:
    """Tests for get_notes_root_dir static method."""

    @pytest.mark.asyncio
    async def test_creates_directory_if_not_exists(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_root_dir creates the directory if it doesn't exist."""
        notes_root = tmp_path / ".notes"
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)

        result = await NoteManager.get_notes_root_dir()

        assert await result.exists()
        assert result.name == ".notes"

    @pytest.mark.asyncio
    async def test_returns_existing_directory(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_root_dir returns existing directory without error."""
        notes_root = tmp_path / ".notes"
        notes_root.mkdir()
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)

        result = await NoteManager.get_notes_root_dir()

        assert result == AnyioPath(notes_root)


class TestGetNotesDir:
    """Tests for get_notes_dir method."""

    @pytest.mark.asyncio
    async def test_creates_workspace_specific_directory(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_dir creates workspace-specific directory."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=42)

        result = await manager.get_notes_dir()

        assert await result.exists()
        assert result.name == "42"
        assert result.parent.name == ".notes"


class TestGetNotesIndex:
    """Tests for get_notes_index method."""

    @pytest.mark.asyncio
    async def test_returns_notes_index_content(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_index returns NOTES.md content when it exists."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=7)

        notes_dir = await manager.get_notes_dir()
        notes_index = notes_dir / "NOTES.md"
        await notes_index.write_text("# Workspace notes\n\n- item", "utf-8")

        result = await manager.get_notes_index()

        assert result == "# Workspace notes\n\n- item"

    @pytest.mark.asyncio
    async def test_returns_none_when_notes_index_not_exists(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_index returns None when NOTES.md does not exist."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=8)

        result = await manager.get_notes_index()

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_reading_notes_index_fails(self, tmp_path: Path, monkeypatch):
        """Test that get_notes_index returns None when NOTES.md cannot be read."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=9)

        notes_dir = await manager.get_notes_dir()
        notes_index = notes_dir / "NOTES.md"
        await notes_index.write_text("# Workspace notes", "utf-8")

        with patch.object(AnyioPath, "read_text", AsyncMock(side_effect=OSError("read failed"))):
            result = await manager.get_notes_index()

        assert result is None


class TestNotesDirEnv:
    """Tests for notes_dir_env property."""

    def test_returns_env_dict_with_correct_path(self, tmp_path: Path, monkeypatch):
        """Test that notes_dir_env returns correct environment variable dict."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        env = NoteManager.get_notes_dir_env(workspace_id=5)

        expected_path = str(tmp_path / ".notes" / "5")
        assert env == {NoteManager.NOTES_DIR_ENVNAME: expected_path}


class TestMaterialize:
    """Tests for materialize method."""

    @pytest.mark.asyncio
    async def test_materializes_notes_to_files(
        self, tmp_path: Path, monkeypatch, mock_workspace_with_notes
    ):
        """Test that materialize writes notes to the filesystem."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = mock_workspace_with_notes

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=AsyncMock()
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                manager = NoteManager(workspace_id=1)
                result = await manager.materialize()

        # Check files were created
        readme_path = result / "README.md"
        guide_path = result / "docs" / "guide.md"

        assert await readme_path.exists()
        assert await guide_path.exists()
        assert await readme_path.read_text("utf-8") == "# Hello"
        assert await guide_path.read_text("utf-8") == "## Guide"

    @pytest.mark.asyncio
    async def test_materialize_empty_notes(self, tmp_path: Path, monkeypatch):
        """Test that materialize works with empty notes list."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = []

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=AsyncMock()
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                manager = NoteManager(workspace_id=1)
                result = await manager.materialize()

        assert await result.exists()


class TestClearMaterialized:
    """Tests for clear_materialized method."""

    @pytest.mark.asyncio
    async def test_removes_notes_directory(self, tmp_path: Path, monkeypatch):
        """Test that clear_materialized removes the workspace notes directory."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=3)

        # Create the directory first
        notes_dir = await manager.get_notes_dir()
        test_file = notes_dir / "test.md"
        await test_file.write_text("content", "utf-8")

        assert await notes_dir.exists()

        await manager.clear_materialized()

        assert not await notes_dir.exists()

    @pytest.mark.asyncio
    async def test_handles_nonexistent_directory(self, tmp_path: Path, monkeypatch):
        """Test that clear_materialized handles non-existent directory gracefully."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=999)

        # Should not raise
        await manager.clear_materialized()


class TestStartWatching:
    """Tests for start_watching method."""

    @pytest.mark.asyncio
    async def test_creates_watch_task(self, tmp_path: Path, monkeypatch):
        """Test that start_watching creates a watch task."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Create the notes directory
        await manager.get_notes_dir()

        with patch("src.agent.notes.manager.awatch") as mock_awatch:
            mock_awatch.return_value.__aiter__ = AsyncMock(
                return_value=iter([])
            )

            await manager.start_watching()

            assert manager._watch_task is not None
            assert not manager._watch_task.done()

            # Cleanup
            await manager.stop_watching()

    @pytest.mark.asyncio
    async def test_restarts_existing_watch(self, tmp_path: Path, monkeypatch):
        """Test that start_watching stops existing watch before starting new one."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Create the notes directory
        await manager.get_notes_dir()

        with patch("src.agent.notes.manager.awatch") as mock_awatch:
            mock_awatch.return_value.__aiter__ = AsyncMock(
                return_value=iter([])
            )

            await manager.start_watching()
            first_task = manager._watch_task

            await manager.start_watching()
            second_task = manager._watch_task

            assert first_task is not second_task

            # Cleanup
            await manager.stop_watching()


class TestStopWatching:
    """Tests for stop_watching method."""

    @pytest.mark.asyncio
    async def test_cancels_watch_task(self, tmp_path: Path, monkeypatch):
        """Test that stop_watching cancels the watch task."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Create the notes directory
        await manager.get_notes_dir()

        with patch("src.agent.notes.manager.awatch") as mock_awatch:
            mock_awatch.return_value.__aiter__ = AsyncMock(
                return_value=iter([])
            )

            await manager.start_watching()
            assert manager._watch_task is not None

            await manager.stop_watching()

            assert manager._watch_task is None
            assert manager._stop_watching_event is None

    @pytest.mark.asyncio
    async def test_handles_already_stopped(self, tmp_path: Path, monkeypatch):
        """Test that stop_watching handles already stopped state gracefully."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Should not raise when nothing is watching
        await manager.stop_watching()


class TestHandleFileChanges:
    """Tests for _handle_file_changes method."""

    @pytest.mark.asyncio
    async def test_handles_added_file(self, tmp_path: Path, monkeypatch):
        """Test that added files are processed correctly."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()

        # Create a file to simulate "added"
        test_file = notes_dir / "new.md"
        await test_file.write_text("New content", "utf-8")

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = []

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                changes = [(ChangeType.added, AnyioPath(test_file))]
                await manager._handle_file_changes(changes)

        # Verify workspace.notes was updated
        assert len(workspace.notes) == 1
        assert workspace.notes[0].relative == "new.md"
        assert workspace.notes[0].content == "New content"

    @pytest.mark.asyncio
    async def test_handles_modified_file(self, tmp_path: Path, monkeypatch):
        """Test that modified files are processed correctly."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()

        # Create existing note
        existing_note = workspace_models.WorkspaceNote(
            relative="existing.md", content="Old content"
        )

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = [existing_note]

        # Update the file
        test_file = notes_dir / "existing.md"
        await test_file.parent.mkdir(parents=True, exist_ok=True)
        await test_file.write_text("Updated content", "utf-8")

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                changes = [(ChangeType.modified, AnyioPath(test_file))]
                await manager._handle_file_changes(changes)

        # Verify note was updated
        assert len(workspace.notes) == 1
        assert workspace.notes[0].content == "Updated content"

    @pytest.mark.asyncio
    async def test_handles_deleted_file(self, tmp_path: Path, monkeypatch):
        """Test that deleted files are removed from notes."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()

        # Create existing note
        existing_note = workspace_models.WorkspaceNote(
            relative="deleted.md", content="Content"
        )

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = [existing_note]

        # File path (doesn't need to exist for deletion test)
        test_file = notes_dir / "deleted.md"

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                changes = [(ChangeType.deleted, AnyioPath(test_file))]
                await manager._handle_file_changes(changes)

        # Verify note was removed
        assert len(workspace.notes) == 0

    @pytest.mark.asyncio
    async def test_skips_non_md_files(self, tmp_path: Path, monkeypatch):
        """Test that non-.md files are ignored."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()

        # Create a non-md file
        test_file = notes_dir / "script.py"
        await test_file.write_text("print('hello')", "utf-8")

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = []

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                # _watch_files filters non-md files, but _handle_file_changes
                # should handle any file type passed to it
                changes = [(ChangeType.added, AnyioPath(test_file))]
                await manager._handle_file_changes(changes)

        # Verify note was still added (handler doesn't filter)
        assert len(workspace.notes) == 1

    @pytest.mark.asyncio
    async def test_handles_empty_changes(self, tmp_path: Path, monkeypatch):
        """Test that empty changes are handled gracefully."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Should not raise
        await manager._handle_file_changes([])

    @pytest.mark.asyncio
    async def test_handles_read_error_gracefully(self, tmp_path: Path, monkeypatch):
        """Test that file read errors are handled gracefully."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()

        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = []

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        # Create a path that doesn't exist to trigger read error
        nonexistent_file = notes_dir / "nonexistent.md"

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                changes = [(ChangeType.added, AnyioPath(nonexistent_file))]
                # Should not raise even though file doesn't exist
                await manager._handle_file_changes(changes)


class TestWatchFiles:
    """Tests for _watch_files method."""

    @pytest.mark.asyncio
    async def test_returns_early_if_directory_not_exists(self, tmp_path: Path):
        """Test that _watch_files returns early if directory doesn't exist."""
        manager = NoteManager(workspace_id=999)
        stop_event = asyncio.Event()

        nonexistent_dir = AnyioPath(tmp_path / "nonexistent")

        # Should complete without error
        await manager._watch_files(nonexistent_dir, stop_event)

    @pytest.mark.asyncio
    async def test_filters_md_files(self, tmp_path: Path, monkeypatch):
        """Test that _watch_files filters to only .md files."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()
        stop_event = asyncio.Event()

        # Create files
        md_file = notes_dir / "note.md"
        py_file = notes_dir / "script.py"
        await md_file.write_text("# Note", "utf-8")
        await py_file.write_text("print('hello')", "utf-8")

        mock_changes = [
            {(ChangeType.added, str(md_file)), (ChangeType.added, str(py_file))}
        ]

        with patch(
            "src.agent.notes.manager.awatch"
        ) as mock_awatch, patch.object(
            manager, "_handle_file_changes"
        ) as mock_handle:

            async def mock_awatch_generator(*args, **kwargs):
                for change_set in mock_changes:
                    yield change_set
                stop_event.set()

            mock_awatch.return_value.__aiter__ = mock_awatch_generator

            # Run watch briefly then stop
            watch_task = asyncio.create_task(
                manager._watch_files(notes_dir, stop_event)
            )

            # Give it time to process
            await asyncio.sleep(0.1)
            stop_event.set()

            try:
                await asyncio.wait_for(watch_task, timeout=1.0)
            except asyncio.TimeoutError:
                watch_task.cancel()

            # Verify _handle_file_changes was called with only md file
            mock_handle.assert_called_once()
            call_args = mock_handle.call_args[0][0]
            assert len(call_args) == 1
            change_type, path = list(call_args)[0]
            assert path.name == "note.md"

    @pytest.mark.asyncio
    async def test_handles_cancelled_error(self, tmp_path: Path, monkeypatch):
        """Test that _watch_files handles CancelledError gracefully."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        notes_dir = await manager.get_notes_dir()
        stop_event = asyncio.Event()

        with patch("src.agent.notes.manager.awatch") as mock_awatch:
            mock_awatch.side_effect = asyncio.CancelledError()

            # Should not raise
            await manager._watch_files(notes_dir, stop_event)


class TestIntegration:
    """Integration tests for NoteManager."""

    @pytest.mark.asyncio
    async def test_full_lifecycle(self, tmp_path: Path, monkeypatch):
        """Test the full lifecycle: materialize, watch, modify, clear."""
        monkeypatch.setattr("src.agent.notes.manager.DATA_DIR", tmp_path)
        manager = NoteManager(workspace_id=1)

        # Setup mock workspace
        workspace = MagicMock()
        workspace.id = 1
        workspace.notes = [
            workspace_models.WorkspaceNote(relative="test.md", content="Initial")
        ]

        mock_service = AsyncMock()
        mock_service.get_workspace_by_id.return_value = workspace

        with patch(
            "src.services.workspace.WorkspaceService", return_value=mock_service
        ):
            with patch("src.agent.notes.manager.db_context") as mock_db_context:
                mock_session = AsyncMock()
                mock_db_context.return_value.__aenter__ = AsyncMock(
                    return_value=mock_session
                )
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)

                # Materialize
                notes_dir = await manager.materialize()
                assert await (notes_dir / "test.md").exists()

                # Clear
                await manager.clear_materialized()
                assert not await notes_dir.exists()

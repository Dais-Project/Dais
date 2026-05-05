import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anyio import Path as AnyioPath

from src.agent.notes import NoteMaterializer
from src.db.models import workspace as workspace_models
from src.schemas import workspace as workspace_schemas


@pytest.mark.integration
class TestNoteMaterializer:
    @pytest.mark.asyncio
    async def test_get_notes_root_dir_creates_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        result = await NoteMaterializer.get_notes_root_dir()

        assert await result.exists()
        assert result == AnyioPath(tmp_path / ".notes")

    @pytest.mark.asyncio
    async def test_get_notes_dir_creates_workspace_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        result = await NoteMaterializer.get_notes_dir(42)

        assert await result.exists()
        assert result == AnyioPath(tmp_path / ".notes" / "42")

    def test_get_notes_dir_env_returns_workspace_specific_env(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        env = NoteMaterializer.get_notes_dir_env(5)

        assert env == {
            NoteMaterializer.NOTES_DIR_ENVNAME: str(tmp_path / ".notes" / "5")
        }

    @pytest.mark.asyncio
    async def test_get_notes_index_returns_content(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        notes_dir = await NoteMaterializer.get_notes_dir(7)
        notes_index = notes_dir / "NOTES.md"
        await notes_index.write_text("# Workspace notes\n\n- item", "utf-8")

        result = await NoteMaterializer.get_notes_index(7)

        assert result == "# Workspace notes\n\n- item"

    @pytest.mark.asyncio
    async def test_get_notes_index_returns_none_when_missing(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        result = await NoteMaterializer.get_notes_index(8)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_notes_index_returns_none_when_read_fails(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        notes_dir = await NoteMaterializer.get_notes_dir(9)
        notes_index = notes_dir / "NOTES.md"
        await notes_index.write_text("# Workspace notes", "utf-8")

        with patch.object(AnyioPath, "read_text", AsyncMock(side_effect=OSError("read failed"))):
            result = await NoteMaterializer.get_notes_index(9)

        assert result is None

    @pytest.mark.asyncio
    async def test_materialize_writes_workspace_notes_to_files(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        workspace = workspace_schemas.WorkspaceRead.model_validate({
            "id": 1,
            "name": "Workspace",
            "directory": "/tmp/workspace",
            "instruction": "",
            "notes": [
                {"id": 1, "relative": "README.md", "content": "# Hello"},
                {"id": 2, "relative": "docs/guide.md", "content": "## Guide"},
            ],
            "usable_agents": [],
            "usable_tools": [],
            "usable_skills": [],
        })

        notes_dir = await NoteMaterializer.materialize(workspace)

        readme_path = Path(str(notes_dir)) / "README.md"
        guide_path = Path(str(notes_dir)) / "docs" / "guide.md"
        assert readme_path.read_text(encoding="utf-8") == "# Hello"
        assert guide_path.read_text(encoding="utf-8") == "## Guide"

    @pytest.mark.asyncio
    async def test_clear_materialized_removes_workspace_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)
        notes_dir = await NoteMaterializer.get_notes_dir(3)
        note_path = Path(str(notes_dir)) / "test.md"
        note_path.write_text("content", encoding="utf-8")

        await NoteMaterializer.clear_materialized(3)

        assert not note_path.exists()
        assert not Path(str(notes_dir)).exists()

    @pytest.mark.asyncio
    async def test_clear_materialized_handles_nonexistent_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        await NoteMaterializer.clear_materialized(999)

        assert not (tmp_path / ".notes" / "999").exists()

    @pytest.mark.asyncio
    async def test_materialize_all_clears_root_dir_then_materializes_each_workspace(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.notes.materializer.DATA_DIR", tmp_path)

        workspace_a = MagicMock(spec=workspace_models.Workspace)
        workspace_a.id = 1
        workspace_b = MagicMock(spec=workspace_models.Workspace)
        workspace_b.id = 2

        mock_service = AsyncMock()
        mock_service.get_all_workspaces.return_value = [workspace_a, workspace_b]

        materialize_mock = AsyncMock()
        workspace_read_mock = MagicMock(side_effect=[
            workspace_schemas.WorkspaceRead.model_validate({
                "id": 1,
                "name": "Workspace A",
                "directory": "/tmp/workspace-a",
                "instruction": "",
                "notes": [{"id": 1, "relative": "a.md", "content": "A"}],
                "usable_agents": [],
                "usable_tools": [],
                "usable_skills": [],
            }),
            workspace_schemas.WorkspaceRead.model_validate({
                "id": 2,
                "name": "Workspace B",
                "directory": "/tmp/workspace-b",
                "instruction": "",
                "notes": [{"id": 2, "relative": "b.md", "content": "B"}],
                "usable_agents": [],
                "usable_tools": [],
                "usable_skills": [],
            }),
        ])
        to_thread_mock = AsyncMock()

        with patch("src.services.workspace.WorkspaceService", return_value=mock_service):
            with patch("src.agent.notes.materializer.db_context") as mock_db_context:
                mock_db_context.return_value.__aenter__ = AsyncMock(return_value=AsyncMock())
                mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)
                with patch("src.agent.notes.materializer.asyncio.to_thread", to_thread_mock):
                    with patch.object(NoteMaterializer, "materialize", materialize_mock):
                        with patch.object(workspace_schemas.WorkspaceRead, "model_validate", workspace_read_mock):
                            await NoteMaterializer.materialize_all()

        notes_root_dir = AnyioPath(tmp_path / ".notes")
        to_thread_mock.assert_awaited_once_with(shutil.rmtree, notes_root_dir)
        assert materialize_mock.await_count == 2


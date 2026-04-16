import asyncio
import shutil
from anyio import Path
from src.common import DATA_DIR
from src.db import db_context


class NoteManager:
    NOTES_DIR_ENVNAME = "DAIS_NOTES_DIR"

    def __init__(self, workspace_id: int):
        self._workspace_id = workspace_id

    @staticmethod
    async def get_notes_root_dir() -> Path:
        notes_root_dir = Path(DATA_DIR, ".notes")
        await notes_root_dir.mkdir(parents=True, exist_ok=True)
        return notes_root_dir

    async def get_notes_dir(self) -> Path:
        notes_root_dir = await self.get_notes_root_dir()
        notes_dir = notes_root_dir / str(self._workspace_id)
        await notes_dir.mkdir(parents=True, exist_ok=True)
        return notes_dir

    @property
    def notes_dir_env(self) -> dict[str, str]:
        return {NoteManager.NOTES_DIR_ENVNAME: str(DATA_DIR / ".notes" / str(self._workspace_id))}

    async def materialize(self) -> Path:
        from src.services.workspace import WorkspaceService

        async with db_context() as db_session:
            workspace = await WorkspaceService(db_session).get_workspace_by_id(self._workspace_id)
            workspace_notes = workspace.notes

        await self.clear_materialized()
        notes_dir = await self.get_notes_dir()
        for note in workspace_notes:
            note_path = notes_dir / note.relative
            await note_path.parent.mkdir(parents=True, exist_ok=True)
            await note_path.write_text(note.content, "utf-8")
        return notes_dir

    async def clear_materialized(self) -> None:
        notes_root_dir = await self.get_notes_root_dir()
        notes_dir = notes_root_dir / str(self._workspace_id)
        if not await notes_dir.exists(): return
        await asyncio.to_thread(shutil.rmtree, notes_dir)

import asyncio
import shutil
from typing import Any, Callable
from anyio import Path as AnyioPath
from pathlib import Path as StdPath
from loguru import logger
from watchfiles import awatch, Change as ChangeType
from src.common import DATA_DIR
from src.db import db_context


type FileChange = tuple[ChangeType, AnyioPath]

class NoteManager:
    NOTES_DIR_ENVNAME = "DAIS_NOTES_DIR"
    _logger = logger.bind(name="NoteManager")

    def __init__(self, workspace_id: int):
        self._workspace_id = workspace_id
        self._stop_watching_event = None
        self._watch_task = None

    @staticmethod
    async def get_notes_root_dir() -> AnyioPath:
        notes_root_dir = AnyioPath(DATA_DIR, ".notes")
        await notes_root_dir.mkdir(parents=True, exist_ok=True)
        return notes_root_dir

    async def get_notes_dir(self) -> AnyioPath:
        notes_root_dir = await self.get_notes_root_dir()
        notes_dir = notes_root_dir / str(self._workspace_id)
        await notes_dir.mkdir(parents=True, exist_ok=True)
        return notes_dir

    @property
    def notes_dir_env(self) -> dict[str, str]:
        return {NoteManager.NOTES_DIR_ENVNAME: str(DATA_DIR / ".notes" / str(self._workspace_id))}

    async def materialize(self) -> AnyioPath:
        from src.services.workspace import WorkspaceService

        async with db_context() as db_session:
            workspace = await WorkspaceService(db_session).get_workspace_by_id(self._workspace_id)
            workspace_notes = workspace.notes

        notes_dir = await self.get_notes_dir()
        for note in workspace_notes:
            note_path = notes_dir / note.relative
            await note_path.parent.mkdir(parents=True, exist_ok=True)
            await note_path.write_text(note.content, "utf-8")
        return notes_dir

    async def clear_materialized(self):
        notes_root_dir = await self.get_notes_root_dir()
        notes_dir = notes_root_dir / str(self._workspace_id)
        if not await notes_dir.exists(): return
        await asyncio.to_thread(shutil.rmtree, notes_dir)

    async def start_watching(self):
        if self._watch_task is not None:
            await self.stop_watching()
        self._stop_watching_event = asyncio.Event()
        notes_dir = await self.get_notes_dir()
        self._watch_task = asyncio.create_task(
            self._watch_files(notes_dir, self._stop_watching_event))

    async def stop_watching(self) -> None:
        if self._stop_watching_event:
            self._stop_watching_event.set()
            self._stop_watching_event = None

        if self._watch_task and not self._watch_task.done():
            self._watch_task.cancel()
            try:
                await self._watch_task
            except asyncio.CancelledError:
                pass
            finally:
                self._watch_task = None

    async def _handle_file_changes(self, changes: list[FileChange]):
        from src.services.workspace import WorkspaceService
        from src.db.models import workspace as workspace_models

        if len(changes) == 0: return
        added_notes: list[tuple[AnyioPath, str]] = [] # (relative, content)
        updated_notes: list[tuple[AnyioPath, str]] = []  # (relative, content)
        deleted_notes: list[AnyioPath] = []

        for change_type, file_path in changes:
            try:
                match change_type:
                    case ChangeType.added:
                        content = await AnyioPath(file_path).read_text("utf-8")
                        added_notes.append((file_path, content))
                    case ChangeType.modified:
                        content = await AnyioPath(file_path).read_text("utf-8")
                        updated_notes.append((file_path, content))
                    case ChangeType.deleted:
                        deleted_notes.append(file_path)
            except Exception:
                # read file failed, skip
                pass

        notes_dir = await self.get_notes_dir()
        normalized_path: Callable[[AnyioPath], str] = lambda path: path.relative_to(notes_dir).as_posix()

        async with db_context() as db_session:
            workspace = await WorkspaceService(db_session).get_workspace_by_id(self._workspace_id)
            existing_notes: dict[str, workspace_models.WorkspaceNote] = {
                note.relative: note for note in workspace.notes
            }

            for path in deleted_notes:
                existing_notes.pop(normalized_path(path))
            for path, content in added_notes:
                relative = normalized_path(path)
                existing_notes[relative] = workspace_models.WorkspaceNote(
                    relative=relative,
                    content=content,
                )
            for path, content in updated_notes:
                relative = normalized_path(path)
                existing_note = existing_notes.get(relative, workspace_models.WorkspaceNote(
                    relative=relative,
                    content=content,
                ))
                existing_note.content = content

            workspace.notes = list(existing_notes.values())

    async def _watch_files(self, notes_dir: AnyioPath, stop_event: asyncio.Event) -> None:
        if not await notes_dir.exists():
            return

        try:
            async for changes in awatch(
                StdPath(notes_dir),
                stop_event=stop_event,
                debounce=500,
                recursive=True,
            ):
                markdown_changes: list[Any] = []
                for change_type, path in changes:
                    path = AnyioPath(path)
                    if await path.is_symlink() or await path.is_dir(): continue
                    if path.suffix.lower() != ".md": continue
                    markdown_changes.append((change_type, path))
                await self._handle_file_changes(markdown_changes)
        except asyncio.CancelledError:
            self._logger.debug(f"Notes watch cancelled for workspace {self._workspace_id}")
        except Exception:
            self._logger.exception(f"Error watching notes for workspace {self._workspace_id}")

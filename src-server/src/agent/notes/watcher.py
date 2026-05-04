import asyncio
from typing import Any, Callable
from anyio import Path as AnyioPath
from pathlib import Path as StdPath
from loguru import logger
from watchfiles import awatch, Change as ChangeType
from src.db import db_context
from .materializer import NoteMaterializer
from .workspace_ref_manager import WorkspaceRefManager


type FileChange = tuple[ChangeType, AnyioPath]

class NoteWatcher:
    _logger = logger.bind(name="NoteWatcher")

    def __init__(self, workspace_id: int) -> None:
        self._workspace_id = workspace_id
        self._stop_watching_event = None
        self._watch_task = None

    async def start_watching(self):
        if self._watch_task is not None:
            await self.stop_watching()
        WorkspaceRefManager.increase_workspace_ref(self._workspace_id)
        self._stop_watching_event = asyncio.Event()

        notes_dir = await NoteMaterializer.get_notes_dir(self._workspace_id)
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
                pass # since the watch_task is cancelled, we should ignore CancelledError here
            finally:
                self._watch_task = None
        WorkspaceRefManager.decrease_workspace_ref(self._workspace_id)

    async def _handle_file_changes(self, base: AnyioPath, changes: list[FileChange]):
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

        normalized_path: Callable[[AnyioPath], str] = lambda path: path.relative_to(base).as_posix()

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
                await self._handle_file_changes(notes_dir, markdown_changes)
        except asyncio.CancelledError:
            self._logger.debug(f"Notes watch cancelled for workspace {self._workspace_id}")
            raise
        except Exception:
            self._logger.exception(f"Error watching notes for workspace {self._workspace_id}")

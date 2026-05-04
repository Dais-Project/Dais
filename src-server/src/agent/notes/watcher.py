from typing import Callable
from anyio import Path as AnyioPath
from loguru import logger
from watchfiles import Change as ChangeType
from src.db import db_context
from src.utils import DirectoryWatcher, FileChange
from .materializer import NoteMaterializer
from .workspace_ref_manager import WorkspaceRefManager


type NoteChange = tuple[ChangeType, AnyioPath]

class NoteWatcher:
    _logger = logger.bind(name="NoteWatcher")

    def __init__(self, workspace_id: int) -> None:
        self._workspace_id = workspace_id
        self._ref_acquired = False
        self._watcher: DirectoryWatcher | None = None

    async def _start(self):
        if self._watcher is not None:
            await self._stop()

        WorkspaceRefManager.increase_workspace_ref(self._workspace_id)
        self._ref_acquired = True
        try:
            notes_dir = await NoteMaterializer.get_notes_dir(self._workspace_id)
            self._watcher = DirectoryWatcher(notes_dir, on_changes=self._handle_file_changes)
            await self._watcher.start()
        except BaseException:
            WorkspaceRefManager.decrease_workspace_ref(self._workspace_id)
            self._ref_acquired = False
            raise

    async def _stop(self) -> None:
        if self._watcher:
            await self._watcher.stop()
            self._watcher = None
        if self._ref_acquired:
            WorkspaceRefManager.decrease_workspace_ref(self._workspace_id)

    async def _handle_file_changes(self, raw_changes: list[FileChange]) -> None:
        notes_dir = await NoteMaterializer.get_notes_dir(self._workspace_id)

        markdown_changes: list[NoteChange] = []
        for change_type, path_str in raw_changes:
            path = AnyioPath(path_str)
            if await path.is_symlink() or await path.is_dir():
                continue
            if path.suffix.lower() != ".md":
                continue
            markdown_changes.append((change_type, path))

        if markdown_changes:
            await self._handle_note_changes(notes_dir, markdown_changes)

    async def _handle_note_changes(self, base: AnyioPath, changes: list[NoteChange]):
        from src.services.workspace import WorkspaceService
        from src.db.models import workspace as workspace_models

        if len(changes) == 0: return

        self._logger.debug(f"Watched changes: {changes}")
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
                existing_notes.pop(normalized_path(path), None)
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

    async def __aenter__(self):
        await self._start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._stop()

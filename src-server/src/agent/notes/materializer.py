import asyncio
import shutil
from anyio import Path as AnyioPath
from loguru import logger
from src.common import DATA_DIR
from src.db import db_context, workspace_models
from src.schemas import workspace as workspace_schemas


class NoteMaterializer:
    NOTES_DIR_ENVNAME = "DAIS_NOTES_DIR"
    _logger = logger.bind(name="NoteMaterializer")

    @staticmethod
    async def get_notes_root_dir() -> AnyioPath:
        notes_root_dir = AnyioPath(DATA_DIR, ".notes")
        await notes_root_dir.mkdir(parents=True, exist_ok=True)
        return notes_root_dir

    @classmethod
    def get_notes_dir_env(cls, workspace_id: int) -> dict[str, str]:
        return {cls.NOTES_DIR_ENVNAME: str(DATA_DIR / ".notes" / str(workspace_id))}

    @classmethod
    async def get_notes_dir(cls, workspace_id: int) -> AnyioPath:
        notes_root_dir = await cls.get_notes_root_dir()
        notes_dir = notes_root_dir / str(workspace_id)
        await notes_dir.mkdir(parents=True, exist_ok=True)
        return notes_dir

    @classmethod
    async def get_notes_index(cls, workspace_id: int) -> str | None:
        notes_dir = await cls.get_notes_dir(workspace_id)
        index_file = notes_dir / "NOTES.md"
        if not await index_file.exists(): return None
        try:
            return await index_file.read_text(encoding="utf-8")
        except:
            cls._logger.exception(f"Failed to read root NOTES.md for workspace {workspace_id}.")
            return None

    @classmethod
    async def materialize(cls, workspace: workspace_schemas.WorkspaceRead) -> AnyioPath:
        notes_dir = await cls.get_notes_dir(workspace.id)
        for note in workspace.notes:
            note_path = notes_dir / note.relative
            await note_path.parent.mkdir(parents=True, exist_ok=True)
            await note_path.write_text(note.content, "utf-8")

        return notes_dir

    @classmethod
    async def materialize_all(cls):
        from src.services.workspace import WorkspaceService

        async with db_context() as db_session:
            workspaces = await WorkspaceService(db_session).get_all_workspaces()

        sem = asyncio.Semaphore(16)
        async def sem_materialize(workspace: workspace_models.Workspace):
            async with sem:
                workspace_read = workspace_schemas.WorkspaceRead.model_validate(workspace)
                await cls.clear_materialized(workspace_read.id)
                await cls.materialize(workspace_read)

        tasks = [sem_materialize(workspace) for workspace in workspaces]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, BaseException):
                cls._logger.opt(exception=result).warning("Failed to materialize workspaces")

    @classmethod
    async def clear_materialized(cls, workspace_id: int):
        cls._logger.debug(f"Clearing notes for workspace {workspace_id}")
        notes_root_dir = await cls.get_notes_root_dir()
        notes_dir = notes_root_dir / str(workspace_id)

        if not await notes_dir.exists(): return
        await asyncio.to_thread(shutil.rmtree, notes_dir)

from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.notes import NoteMaterializer, WorkspaceRefManager
from src.db.models import workspace as workspace_models
from src.repositories.workspace import WorkspaceRepository
from src.schemas import workspace as workspace_schemas
from src.utils.open_in_file_manager import open_in_file_manager

from .exceptions import ConflictError, NotFoundError, ServiceErrorCode
from .resource_events import WorkspaceChangedEvent, ResourceEventHandler, ignore_resource_event


class WorkspaceNotFoundError(NotFoundError):
    def __init__(self, workspace_id: int):
        super().__init__(
            ServiceErrorCode.WORKSPACE_NOT_FOUND,
            "Workspace",
            workspace_id,
        )


class WorkspaceNotesLockedError(ConflictError):
    def __init__(self):
        super().__init__(
            ServiceErrorCode.WORKSPACE_NOTES_LOCKED_BY_RUNNING_TASK,
            "Workspace notes are locked by a running task",
        )


class WorkspaceService:
    def __init__(self,
                 repository: WorkspaceRepository,
                 on_resource_changed: ResourceEventHandler = ignore_resource_event):
        self._repository = repository
        self._on_resource_changed = on_resource_changed

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> WorkspaceService:
        return cls(WorkspaceRepository(db_session))

    async def get_page(self, query: str | None = None):
        return await self._repository.get_page(query)

    async def get_all(self) -> list[workspace_models.Workspace]:
        return await self._repository.get_all()

    async def get_by_id(self, workspace_id: int) -> workspace_models.Workspace:
        workspace = await self._repository.get_by_id(workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError(workspace_id)
        return workspace

    async def get_frequent(self,
                           *,
                           limit: int,
                           recent_task_limit: int) -> list[workspace_models.Workspace]:
        return await self._repository.get_frequent(
            limit=limit,
            recent_task_limit=recent_task_limit,
        )

    async def create(self, data: workspace_schemas.WorkspaceCreate) -> workspace_models.Workspace:
        agents = await self._repository.get_agents_by_ids(data.usable_agent_ids)
        tools = await self._repository.get_tools_by_ids(data.usable_tool_ids)
        skills = await self._repository.get_skills_by_ids(data.usable_skill_ids)
        workspace = await self._repository.create(
            data,
            agents=agents,
            tools=tools,
            skills=skills,
        )
        await NoteMaterializer.materialize(
            workspace_schemas.WorkspaceRead.model_validate(workspace)
        )
        self._on_resource_changed(WorkspaceChangedEvent.build(
            operation="created",
            resource_id=workspace.id,
        ))
        return workspace

    async def update(self,
                     workspace_id: int,
                     data: workspace_schemas.WorkspaceUpdate) -> workspace_models.Workspace:
        workspace = await self.get_by_id(workspace_id)
        agents = (await self._repository.get_agents_by_ids(data.usable_agent_ids)
                               if data.usable_agent_ids is not None
                               else None)
        tools = (await self._repository.get_tools_by_ids(data.usable_tool_ids)
                               if data.usable_tool_ids is not None
                               else None)
        skills = (await self._repository.get_skills_by_ids(data.usable_skill_ids)
                               if data.usable_skill_ids is not None
                               else None)
        updated_workspace = await self._repository.update(
            workspace,
            data,
            agents=agents,
            tools=tools,
            skills=skills,
        )
        self._on_resource_changed(WorkspaceChangedEvent.build(
            operation="updated",
            resource_id=workspace.id,
        ))
        return updated_workspace

    async def update_notes(self,
                           workspace_id: int,
                           data: workspace_schemas.WorkspaceNotesUpdate) -> workspace_models.Workspace:
        if WorkspaceRefManager.is_workspace_in_use(workspace_id):
            raise WorkspaceNotesLockedError()

        workspace = await self.get_by_id(workspace_id)
        updated_workspace = await self._repository.replace_notes(workspace, data.notes)
        workspace_read = workspace_schemas.WorkspaceRead.model_validate(
            updated_workspace
        )
        await NoteMaterializer.clear_materialized(workspace_id)
        await NoteMaterializer.materialize(workspace_read)
        self._on_resource_changed(WorkspaceChangedEvent.build(
            operation="updated",
            resource_id=workspace_id,
        ))
        return updated_workspace

    async def delete(self, workspace_id: int):
        workspace = await self.get_by_id(workspace_id)
        await self._repository.delete(workspace)
        await NoteMaterializer.clear_materialized(workspace_id)
        self._on_resource_changed(WorkspaceChangedEvent.build(
            operation="deleted",
            resource_id=workspace_id,
        ))

    async def open_in_file_manager(self, workspace_id: int):
        workspace = await self.get_by_id(workspace_id)
        await open_in_file_manager(workspace.directory)

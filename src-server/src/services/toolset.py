from typing import NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import toolset as toolset_models
from src.repositories.toolset import ToolsetRepository
from src.schemas import toolset as toolset_schemas

from .exceptions import ConflictError, NotFoundError, ServiceErrorCode
from .resource_events import ToolsetChangedEvent, ResourceEventHandler, ignore_resource_event


class ToolsetNotFoundError(NotFoundError):
    def __init__(self, toolset_identifier: int | str):
        super().__init__(
            ServiceErrorCode.TOOLSET_NOT_FOUND,
            "Toolset",
            toolset_identifier,
        )


class ToolsetInternalKeyAlreadyExistsError(ConflictError):
    def __init__(self, name: str):
        super().__init__(
            ServiceErrorCode.TOOLSET_INTERNAL_KEY_ALREADY_EXISTS,
            f"Toolset '{name}' already exists",
        )


class ToolNotFoundError(NotFoundError):
    def __init__(self, tool_id: int):
        super().__init__(ServiceErrorCode.TOOL_NOT_FOUND, "Tool", tool_id)


class ToolsetService:
    def __init__(self,
                 repository: ToolsetRepository,
                 on_resource_changed: ResourceEventHandler = ignore_resource_event):
        self._repository = repository
        self._on_resource_changed = on_resource_changed

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> ToolsetService:
        return cls(ToolsetRepository(db_session))

    async def get_all_mcp(self, query: str | None = None) -> list[toolset_models.Toolset]:
        return await self._repository.get_by_types(
            [
                toolset_models.ToolsetType.MCP_LOCAL,
                toolset_models.ToolsetType.MCP_REMOTE,
            ],
            query,
        )

    async def get_all_builtin(self, query: str | None = None) -> list[toolset_models.Toolset]:
        return await self._repository.get_by_types(
            [toolset_models.ToolsetType.BUILT_IN],
            query,
        )

    async def get_by_id(self, toolset_id: int) -> toolset_models.Toolset:
        toolset = await self._repository.get_by_id(toolset_id)
        if toolset is None:
            raise ToolsetNotFoundError(toolset_id)
        return toolset

    async def get_by_internal_key(self, internal_key: str) -> toolset_models.Toolset:
        toolset = await self._repository.get_by_internal_key(internal_key)
        if toolset is None:
            raise ToolsetNotFoundError(internal_key)
        return toolset

    async def create(self,
                     data: toolset_schemas.ToolsetCreate,
                     tools: list[ToolsetRepository.ToolLike]) -> toolset_models.Toolset:
        if await self._repository.get_by_internal_key(data.name) is not None:
            raise ToolsetInternalKeyAlreadyExistsError(data.name)
        toolset = await self._repository.create(data, tools)
        self._on_resource_changed(ToolsetChangedEvent.build(
            operation="created",
            resource_id=toolset.id,
        ))
        return toolset

    async def update(self,
                     toolset_id: int,
                     data: toolset_schemas.ToolsetUpdate) -> toolset_models.Toolset:
        toolset = await self.get_by_id(toolset_id)
        if data.tools is not None:
            existing_ids = {tool.id for tool in toolset.tools}
            for tool_data in data.tools:
                if tool_data.id not in existing_ids:
                    raise ToolNotFoundError(tool_data.id)
        updated = await self._repository.update(toolset, data)
        self._on_resource_changed(ToolsetChangedEvent.build(
            operation="updated",
            resource_id=toolset.id,
        ))
        return updated

    async def sync(self,
                   toolset_id: int,
                   latest_tools: list[ToolsetRepository.ToolLike]) -> toolset_models.Toolset:
        toolset = await self.get_by_id(toolset_id)
        return await self._repository.sync(toolset, latest_tools)

    async def delete(self, toolset_id: int):
        toolset = await self.get_by_id(toolset_id)
        await self._repository.delete(toolset)
        self._on_resource_changed(ToolsetChangedEvent.build(
            operation="deleted",
            resource_id=toolset_id,
        ))

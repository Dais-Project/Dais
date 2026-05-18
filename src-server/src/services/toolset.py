from typing import NamedTuple
from dais_sdk.types import ToolDef
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.models import toolset as toolset_models
from src.schemas import toolset as toolset_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ConflictError, ServiceErrorCode


class ToolsetNotFoundError(NotFoundError):
    def __init__(self, toolset_identifier: int | str) -> None:
        super().__init__(ServiceErrorCode.TOOLSET_NOT_FOUND, "Toolset", toolset_identifier)

class ToolsetInternalKeyAlreadyExistsError(ConflictError):
    def __init__(self, name: str) -> None:
        super().__init__(ServiceErrorCode.TOOLSET_INTERNAL_KEY_ALREADY_EXISTS, f"Toolset '{name}' already exists")

class ToolNotFoundError(NotFoundError):
    def __init__(self, tool_id: int) -> None:
        super().__init__(ServiceErrorCode.TOOL_NOT_FOUND, "Tool", tool_id)

class ToolsetService(ServiceBase):
    class ToolLike(NamedTuple):
        name: str
        internal_key: str
        description: str
        auto_approve: bool = False

    @staticmethod
    def relations():
        return [
            selectinload(toolset_models.Toolset.tools),
        ]

    async def get_all_mcp_toolsets(self) -> list[toolset_models.Toolset]:
        stmt = (
            select(toolset_models.Toolset)
            .where(
                toolset_models.Toolset.type.in_(
                    [
                        toolset_models.ToolsetType.MCP_LOCAL,
                        toolset_models.ToolsetType.MCP_REMOTE,
                    ]
                )
            )
            .options(*self.relations())
        )
        toolsets = (await self._db_session.scalars(stmt)).all()
        return list(toolsets)

    async def get_all_builtin_toolsets(self) -> list[toolset_models.Toolset]:
        stmt = (
            select(toolset_models.Toolset)
            .where(toolset_models.Toolset.type == toolset_models.ToolsetType.BUILT_IN)
            .options(*self.relations())
        )
        toolsets = (await self._db_session.scalars(stmt)).all()
        return list(toolsets)

    async def get_toolset_by_id(self, id: int) -> toolset_models.Toolset:
        toolset = await self._db_session.get(
            toolset_models.Toolset,
            id,
            options=self.relations(),
        )
        if not toolset:
            raise ToolsetNotFoundError(id)
        return toolset

    async def get_toolset_by_internal_key(self, internal_key: str) -> toolset_models.Toolset:
        stmt = (
            select(toolset_models.Toolset)
            .where(toolset_models.Toolset.internal_key == internal_key)
            .options(*self.relations())
        )
        toolset = await self._db_session.scalar(stmt)
        if not toolset:
            raise ToolsetNotFoundError(internal_key)
        return toolset

    async def create_toolset(self, data: toolset_schemas.ToolsetCreate, tools: list[ToolLike]) -> toolset_models.Toolset:
        try:
            await self.get_toolset_by_internal_key(data.name)
        except ToolsetNotFoundError:
            pass
        else:
            raise ToolsetInternalKeyAlreadyExistsError(data.name)

        new_toolset = toolset_models.Toolset(
            **data.model_dump(exclude={"params"}),
            params=data.params,
            internal_key=data.name,
            tools=[toolset_models.Tool(
                name=tool.name,
                internal_key=tool.internal_key,
                description=tool.description,
            ) for tool in tools],
        )

        self._db_session.add(new_toolset)
        new_id = await self.flush_and_expunge(new_toolset)
        return await self.get_toolset_by_id(new_id)

    async def update_toolset(self, id: int, data: toolset_schemas.ToolsetUpdate) -> toolset_models.Toolset:
        toolset = await self.get_toolset_by_id(id)

        if data.tools is not None:
            for tool_data in data.tools:
                await self.update_tool(id, tool_data.id, tool_data)

        if data.params is not None:
            toolset.params = data.params

        self.apply_fields(toolset, data, exclude={"params", "tools"})
        new_id = await self.flush_and_expunge(toolset)
        return await self.get_toolset_by_id(new_id)

    async def update_tool(
        self, toolset_id: int, tool_id: int, data: toolset_schemas.ToolUpdate
    ) -> toolset_models.Tool:
        stmt = select(toolset_models.Tool).where(
            toolset_models.Tool.id == tool_id,
            toolset_models.Tool.toolset_id == toolset_id,
        )
        tool = await self._db_session.scalar(stmt)
        if not tool:
            raise ToolNotFoundError(tool_id)
        self.apply_fields(tool, data, exclude={"id"})

        await self._db_session.flush()
        await self._db_session.refresh(tool)
        return tool

    async def sync_toolset(
        self, id: int, latest_tools: list[ToolLike]
    ) -> toolset_models.Toolset:
        synced_toolset = await self.get_toolset_by_id(id)

        latest_tool_keys: set[str] = set(tool.internal_key for tool in latest_tools)
        existing_tools = list(synced_toolset.tools)
        existing_tool_keys: set[str] = set(tool.internal_key for tool in existing_tools)

        for tool in latest_tools:
            if tool.internal_key not in existing_tool_keys:
                synced_toolset.tools.append(
                    toolset_models.Tool(
                        name=tool.name,
                        internal_key=tool.internal_key,
                        description=tool.description,
                        is_enabled=True,
                        auto_approve=tool.auto_approve,
                    )
                )
        for existing_tool in existing_tools:
            if existing_tool.internal_key not in latest_tool_keys:
                synced_toolset.tools.remove(existing_tool)

        new_id = await self.flush_and_expunge(synced_toolset)
        return await self.get_toolset_by_id(new_id)

    async def delete_toolset(self, id: int) -> None:
        toolset = await self._db_session.get(toolset_models.Toolset, id)
        if not toolset:
            raise ToolsetNotFoundError(id)
        await self._db_session.delete(toolset)
        await self._db_session.flush()

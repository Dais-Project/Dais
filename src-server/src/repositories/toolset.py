from collections.abc import Sequence
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import toolset as toolset_models
from src.schemas import toolset as toolset_schemas

from .repository_base import RepositoryBase


class ToolsetRepository(RepositoryBase[toolset_models.Toolset]):
    class ToolLike(NamedTuple):
        name: str
        internal_key: str
        description: str
        auto_approve: bool = False

    @staticmethod
    def relations():
        return [selectinload(toolset_models.Toolset.tools)]

    async def get_by_types(self,
                           types: Sequence[toolset_models.ToolsetType],
                           query: str | None = None) -> list[toolset_models.Toolset]:
        stmt = (
            select(toolset_models.Toolset)
            .where(toolset_models.Toolset.type.in_(types))
            .options(*self.relations())
        )
        if query:
            stmt = stmt.where(toolset_models.Toolset.name.ilike(f"%{query}%"))
        toolsets = (await self._db_session.scalars(stmt)).all()
        return list(toolsets)

    async def get_by_id(self, toolset_id: int) -> toolset_models.Toolset | None:
        return await self._db_session.get(
            toolset_models.Toolset,
            toolset_id,
            options=self.relations(),
        )

    async def get_by_internal_key(self, internal_key: str) -> toolset_models.Toolset | None:
        return await self._db_session.scalar(
            select(toolset_models.Toolset)
            .where(toolset_models.Toolset.internal_key == internal_key)
            .options(*self.relations())
        )

    async def create(self,
                     data: toolset_schemas.ToolsetCreate,
                     tools: list[ToolLike]) -> toolset_models.Toolset:
        toolset = toolset_models.Toolset(
            **data.model_dump(exclude={"params"}),
            params=data.params,
            internal_key=data.name,
            tools=[
                toolset_models.Tool(
                    name=tool.name,
                    internal_key=tool.internal_key,
                    description=tool.description,
                    auto_approve=tool.auto_approve,
                )
                for tool in tools
            ],
        )
        self._db_session.add(toolset)
        toolset_id = await self.flush_and_expunge(toolset)
        created = await self.get_by_id(toolset_id)
        assert created is not None
        return created

    async def update(self,
                     toolset: toolset_models.Toolset,
                     data: toolset_schemas.ToolsetUpdate) -> toolset_models.Toolset:
        if data.tools is not None:
            for tool_data in data.tools:
                tool = next(
                    (item for item in toolset.tools if item.id == tool_data.id),
                    None,
                )
                if tool is not None:
                    for key, value in tool_data.model_dump(
                        exclude_unset=True,
                        exclude={"id"},
                    ).items():
                        if value is not None:
                            setattr(tool, key, value)
        if data.params is not None:
            toolset.params = data.params
        self.apply_fields(toolset, data, exclude={"params", "tools"})
        toolset_id = await self.flush_and_expunge(toolset)
        updated = await self.get_by_id(toolset_id)
        assert updated is not None
        return updated

    async def sync(self, toolset: toolset_models.Toolset, latest_tools) -> toolset_models.Toolset:
        latest_keys = {tool.internal_key for tool in latest_tools}
        existing_keys = {tool.internal_key for tool in toolset.tools}
        for tool in latest_tools:
            if tool.internal_key not in existing_keys:
                toolset.tools.append(
                    toolset_models.Tool(
                        name=tool.name,
                        internal_key=tool.internal_key,
                        description=tool.description,
                        is_enabled=True,
                        auto_approve=tool.auto_approve,
                    )
                )
        for existing_tool in list(toolset.tools):
            if existing_tool.internal_key not in latest_keys:
                toolset.tools.remove(existing_tool)
        toolset_id = await self.flush_and_expunge(toolset)
        synced = await self.get_by_id(toolset_id)
        assert synced is not None
        return synced

    async def delete(self, toolset: toolset_models.Toolset):
        await self._db_session.delete(toolset)
        await self._db_session.flush()

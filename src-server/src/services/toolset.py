from typing import NamedTuple
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from dais_sdk import LocalMcpClient, RemoteMcpClient, LocalServerParams, RemoteServerParams
from .ServiceBase import ServiceBase
from .exceptions import NotFoundError, ConflictError, BadRequestError
from ..db.models import toolset as toolset_models
from ..db.schemas import toolset as toolset_schemas


class ToolsetNotFoundError(NotFoundError):
    """Raised when a toolset is not found."""
    def __init__(self, toolset_identifier: int | str) -> None:
        super().__init__("Toolset", toolset_identifier)

class ToolsetInternalKeyAlreadyExistsError(ConflictError):
    """Raised when attempting to create a toolset with a name that already exists."""
    def __init__(self, name: str) -> None:
        super().__init__(f"Toolset '{name}' already exists")

class ToolNotFoundError(NotFoundError):
    """Raised when a tool is not found."""
    def __init__(self, tool_id: int) -> None:
        super().__init__("Tool", tool_id)

class CannotCreateBuiltinToolsetError(BadRequestError):
    """Raised when attempting to create a builtin toolset."""
    def __init__(self) -> None:
        super().__init__("Cannot create builtin toolset")

class ToolsetService(ServiceBase):
    class ToolLike(NamedTuple):
        name: str
        internal_key: str
        description: str

    def get_all_mcp_toolsets(self) -> list[toolset_models.Toolset]:
        stmt = select(toolset_models.Toolset).where(
            toolset_models.Toolset.type.in_(
                [toolset_models.ToolsetType.MCP_LOCAL,
                 toolset_models.ToolsetType.MCP_REMOTE]
            )
        ).options(
            selectinload(toolset_models.Toolset.tools)
        )
        toolsets = self._db_session.execute(stmt).scalars().all()
        return list(toolsets)

    def get_all_built_in_toolsets(self) -> list[toolset_models.Toolset]:
        stmt = (select(toolset_models.Toolset)
               .where(toolset_models.Toolset.type == toolset_models.ToolsetType.BUILT_IN)
               .options(selectinload(toolset_models.Toolset.tools)))
        toolsets = self._db_session.execute(stmt).scalars().all()
        return list(toolsets)

    def get_toolset_by_id(self, id: int) -> toolset_models.Toolset:
        toolset = self._db_session.get(
            toolset_models.Toolset,
            id,
            options=[selectinload(toolset_models.Toolset.tools)])
        if not toolset:
            raise ToolsetNotFoundError(id)
        return toolset

    def get_toolset_by_internal_key(self, internal_key: str) -> toolset_models.Toolset:
        stmt = (select(toolset_models.Toolset)
               .where(toolset_models.Toolset.internal_key == internal_key)
               .options(selectinload(toolset_models.Toolset.tools)))
        toolset = self._db_session.execute(stmt).scalar_one_or_none()
        if not toolset:
            raise ToolsetNotFoundError(internal_key)
        return toolset

    async def create_toolset(self, data: toolset_schemas.ToolsetCreate) -> toolset_models.Toolset:
        match data.type:
            case toolset_models.ToolsetType.BUILT_IN:
                raise CannotCreateBuiltinToolsetError()
            case toolset_models.ToolsetType.MCP_LOCAL:
                assert isinstance(data.params, LocalServerParams)
                client = LocalMcpClient(data.name, data.params)
            case toolset_models.ToolsetType.MCP_REMOTE:
                assert isinstance(data.params, RemoteServerParams)
                client = RemoteMcpClient(data.name, data.params)

        try:
            self.get_toolset_by_internal_key(data.name)
        except ToolsetNotFoundError: pass
        else: raise ToolsetInternalKeyAlreadyExistsError(data.name)

        await client.connect()
        try:
            tools = await client.list_tools()
        finally:
            await client.disconnect()

        new_toolset = toolset_models.Toolset(
            **data.model_dump(),
            internal_key=data.name,
            tools=[toolset_models.Tool.from_mcp_tool(tool)
                   for tool in tools]
        )

        try:
            self._db_session.add(new_toolset)
            self._db_session.commit()
            self._db_session.refresh(new_toolset)

            _ = new_toolset.tools # load tools
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_toolset

    def update_toolset(self, id: int, data: toolset_schemas.ToolsetUpdate) -> toolset_models.Toolset:
        stmt = select(toolset_models.Toolset).where(
            toolset_models.Toolset.id == id)
        toolset = self._db_session.execute(stmt).scalar_one_or_none()
        if not toolset:
            raise ToolsetNotFoundError(id)

        if data.tools is not None:
            for tool_data in data.tools:
                self.update_tool(id, tool_data.id, tool_data)

        for key, value in data.model_dump(exclude={"tools"}, exclude_unset=True).items():
            if value is not None:
                setattr(toolset, key, value)

        try:
            self._db_session.commit()
            self._db_session.refresh(toolset)
            _ = toolset.tools # force to load tools
        except Exception as e:
            self._db_session.rollback()
            raise e
        return toolset

    def update_tool(self, toolset_id: int, tool_id: int, data: toolset_schemas.ToolUpdate) -> toolset_models.Tool:
        stmt = select(toolset_models.Tool).where(
            toolset_models.Tool.id == tool_id,
            toolset_models.Tool.toolset_id == toolset_id)
        tool = self._db_session.execute(stmt).scalar_one_or_none()
        if not tool:
            raise ToolNotFoundError(tool_id)
        for key, value in data.model_dump(exclude={"id"}, exclude_unset=True).items():
            if value is not None:
                setattr(tool, key, value)
        try:
            self._db_session.commit()
            self._db_session.refresh(tool)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return tool

    def sync_toolset(self, id: int, latest_tools: list[ToolLike]) -> toolset_models.Toolset:
        toolset = self._db_session.get(
            toolset_models.Toolset,
            id,
            options=[selectinload(toolset_models.Toolset.tools)])
        if not toolset:
            raise ToolsetNotFoundError(id)

        latest_tool_keys: set[str] = set(tool.internal_key for tool in latest_tools)
        existing_tools = list(toolset.tools)
        existing_tool_keys: set[str] = set(tool.internal_key for tool in existing_tools)

        for tool in latest_tools:
            if tool.internal_key not in existing_tool_keys:
                toolset.tools.append(toolset_models.Tool(
                    name=tool.name,
                    internal_key=tool.internal_key,
                    description=tool.description,
                    is_enabled=True,
                    auto_approve=False,
                ))
        for existing_tool in existing_tools:
            if existing_tool.internal_key not in latest_tool_keys:
                toolset.tools.remove(existing_tool)

        try:
            self._db_session.commit()
            self._db_session.refresh(toolset)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return toolset

    def delete_toolset(self, id: int) -> None:
        stmt = select(toolset_models.Toolset).where(
            toolset_models.Toolset.id == id)
        toolset = self._db_session.execute(stmt).scalar_one_or_none()
        if not toolset:
            raise ToolsetNotFoundError(id)
        try:
            self._db_session.delete(toolset)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e

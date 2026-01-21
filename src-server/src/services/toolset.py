from werkzeug.exceptions import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from liteai_sdk import LocalMcpClient, RemoteMcpClient, LocalServerParams, RemoteServerParams
from .ServiceBase import ServiceBase
from ..db.models import toolset as toolset_models
from ..db.schemas import toolset as toolset_schemas
from ..utils import use_async_task_pool

class ToolsetNotFoundError(HTTPException):
    code = 404
    def __init__(self, toolset_identifier: int | str) -> None:
        description = f"Toolset {toolset_identifier} not found"
        super().__init__(description=description)

class ToolsetNameAlreadyExistsError(HTTPException):
    code = 400
    def __init__(self, name: str) -> None:
        description = f"Toolset {name} already exists"
        super().__init__(description=description)

class ToolNotFoundError(HTTPException):
    code = 404
    def __init__(self, tool_id: int) -> None:
        description = f"Tool {tool_id} not found"
        super().__init__(description=description)

class CannotCreateBuiltinToolsetError(HTTPException):
    code = 400
    description = "Cannot create builtin toolset"

class ToolsetService(ServiceBase):
    def get_toolsets(self, page: int = 1, per_page: int = 10) -> dict:
        if page < 1: page = 1
        if per_page < 5 or per_page > 100: per_page = 10

        count_stmt = select(func.count(toolset_models.Toolset.id))
        total = self._db_session.execute(count_stmt).scalar() or 0

        offset = (page - 1) * per_page
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        stmt = select(toolset_models.Toolset).options(
            selectinload(toolset_models.Toolset.tools)
        ).limit(per_page).offset(offset)
        toolsets = self._db_session.execute(stmt).scalars().all()

        return {
            "items": list(toolsets),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

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
               .where(toolset_models.Toolset.type == toolset_models.ToolsetType.BUILTIN)
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

    def create_toolset(self, data: toolset_schemas.ToolsetCreate) -> toolset_models.Toolset:
        match data.type:
            case toolset_models.ToolsetType.BUILTIN:
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
        else: raise ToolsetNameAlreadyExistsError(data.name)

        async def list_tools():
            await client.connect()
            tools = await client.list_tools()
            await client.disconnect()
            return tools

        async_task_pool = use_async_task_pool()
        task_id = async_task_pool.add_task(list_tools())
        tools = async_task_pool.wait_result(task_id)
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

        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(toolset, key, value)

        try:
            self._db_session.commit()
            self._db_session.refresh(toolset)
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
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(tool, key, value)
        try:
            self._db_session.commit()
            self._db_session.refresh(tool)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return tool

    def sync_toolset(self, id: int, latest_tool_names: list[str]) -> toolset_models.Toolset:
        toolset = self._db_session.get(
            toolset_models.Toolset,
            id,
            options=[selectinload(toolset_models.Toolset.tools)])
        if not toolset:
            raise ToolsetNotFoundError(id)

        latest_tool_keys: set[str] = set(latest_tool_names)
        existing_tools = list(toolset.tools)
        existing_tool_keys: set[str] = set(tool.internal_key for tool in existing_tools)

        for name in latest_tool_names:
            if name not in existing_tool_keys:
                toolset.tools.append(toolset_models.Tool(
                    name=name,
                    internal_key=name,
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
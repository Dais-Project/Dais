from werkzeug.exceptions import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from .ServiceBase import ServiceBase
from ..db.models import toolset as toolset_models
from ..db.schemas import toolset as toolset_schemas

class ToolsetNotFoundError(HTTPException):
    code = 404
    description = "Toolset not found"

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

    def get_toolset_by_id(self, id: int) -> toolset_models.Toolset | None:
        return self._db_session.get(
            toolset_models.Toolset,
            id,
            options=[selectinload(toolset_models.Toolset.tools)])

    def create_toolset(self, data: toolset_schemas.ToolsetCreate) -> toolset_models.Toolset:
        new_toolset = toolset_models.Toolset(**data.model_dump())

        try:
            self._db_session.add(new_toolset)
            self._db_session.commit()
            self._db_session.refresh(new_toolset)
        except Exception as e:
            self._db_session.rollback()
            raise e
        return new_toolset

    def update_toolset(self, id: int, data: toolset_schemas.ToolsetUpdate) -> toolset_models.Toolset:
        stmt = select(toolset_models.Toolset).where(
            toolset_models.Toolset.id == id)
        toolset = self._db_session.execute(stmt).scalar_one_or_none()
        if not toolset:
            raise ToolsetNotFoundError(f"Toolset {id} not found")

        # 忽略 tools 相关的逻辑（ToolsetUpdate schema 中没有 tools 字段，所以这里只是保留原注释）

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

    def delete_toolset(self, id: int) -> None:
        stmt = select(toolset_models.Toolset).where(
            toolset_models.Toolset.id == id)
        toolset = self._db_session.execute(stmt).scalar_one_or_none()
        if not toolset:
            raise ToolsetNotFoundError(f"Toolset {id} not found")
        try:
            self._db_session.delete(toolset)
            self._db_session.commit()
        except Exception as e:
            self._db_session.rollback()
            raise e
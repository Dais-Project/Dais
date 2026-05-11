from abc import ABC
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Base


class ServiceBase[Ent: Base](ABC):
    def __init__(self, db_session: AsyncSession):
        self._db_session = db_session

    def apply_fields(self, entity: Ent, data: BaseModel, exclude: set[str] | None = None):
        exclude = exclude or set()
        dump_data = data.model_dump(exclude_unset=True, exclude=exclude)
        for key, value in dump_data.items():
            if hasattr(entity, key) and value is not None:
                setattr(entity, key, value)

    async def flush_and_expunge(self, entity: Ent) -> int:
        await self._db_session.flush()
        entity_id = getattr(entity, "id")
        self._db_session.expunge(entity)
        return entity_id

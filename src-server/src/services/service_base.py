from abc import ABC
from typing import Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

class ServiceBase(ABC):
    def __init__(self, db_session: AsyncSession):
        self._db_session = db_session

    def apply_fields(self, entity: Any, data: BaseModel, exclude: set[str] | None = None):
        exclude = exclude or set()
        dump_data = data.model_dump(exclude_unset=True, exclude=exclude)
        for key, value in dump_data.items():
            if hasattr(entity, key) and value is not None:
                setattr(entity, key, value)

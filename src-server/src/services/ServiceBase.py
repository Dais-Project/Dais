from abc import ABC
from sqlalchemy.ext.asyncio import AsyncSession

class ServiceBase(ABC):
    def __init__(self, db_session: AsyncSession):
        self._db_session = db_session

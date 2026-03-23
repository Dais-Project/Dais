from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.service_base import ServiceBase


class DummyEntity:
    def __init__(self, name: str, count: int) -> None:
        self.name = name
        self.count = count


class DummyData(BaseModel):
    name: str | None = None
    count: int | None = None
    extra: str | None = None


class DummyService(ServiceBase):
    pass


class TestServiceBase:
    def test_apply_fields_updates_set_values(self, db_session: AsyncSession):
        service = DummyService(db_session)
        entity = DummyEntity(name="old", count=1)
        data = DummyData(name="new", count=None, extra="ignored")

        service.apply_fields(entity, data)

        assert entity.name == "new"
        assert entity.count == 1
        assert not hasattr(entity, "extra")

    def test_apply_fields_respects_exclude(self, db_session: AsyncSession):
        service = DummyService(db_session)
        entity = DummyEntity(name="old", count=1)
        data = DummyData(name="new", count=2)

        service.apply_fields(entity, data, exclude={"count"})

        assert entity.name == "new"
        assert entity.count == 1

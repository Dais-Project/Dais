import pytest
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
    @pytest.mark.parametrize(
        "data,exclude,expected_name,expected_count,expects_extra",
        [
            (DummyData(name="new", count=None, extra="ignored"), None, "new", 1, False),
            (DummyData(name="new", count=2), {"count"}, "new", 1, False),
        ],
        ids=["updates-set-fields-only", "respects-exclude"],
    )
    def test_apply_fields_updates_entity(
        self,
        db_session: AsyncSession,
        data: DummyData,
        exclude: set[str] | None,
        expected_name: str,
        expected_count: int,
        expects_extra: bool,
    ):
        service = DummyService(db_session)
        entity = DummyEntity(name="old", count=1)

        service.apply_fields(entity, data, exclude=exclude)

        assert entity.name == expected_name
        assert entity.count == expected_count
        assert hasattr(entity, "extra") is expects_extra

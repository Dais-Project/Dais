import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import skill as skill_models
from src.repositories.skill import SkillRepository
from src.schemas import skill as skill_schemas


@pytest.fixture
def skill_repository(db_session: AsyncSession) -> SkillRepository:
    return SkillRepository(db_session)


@pytest.mark.integration
class TestSkillRepository:
    @pytest.mark.asyncio
    async def test_get_query_filters_and_orders_results(
        self,
        skill_repository: SkillRepository,
        db_session: AsyncSession,
        skill_factory,
    ):
        name_match = await skill_factory(name="Pytest Skill", description="Tests")
        description_match = await skill_factory(
            name="Migration",
            description="Pytest Alembic",
        )
        await skill_factory(name="Other", description="General")

        rows = await db_session.scalars(skill_repository.get_query("pytest"))

        assert [skill.id for skill in rows.all()] == [
            name_match.id,
            description_match.id,
        ]

    @pytest.mark.asyncio
    async def test_create_update_and_delete_skill_resources(
        self,
        skill_repository: SkillRepository,
        db_session: AsyncSession,
    ):
        created = await skill_repository.create(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="Description A",
                content="Content A",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="a.md",
                        content="A",
                    )
                ],
            )
        )
        old_resource_id = created.resources[0].id

        updated = await skill_repository.update(
            created,
            skill_schemas.SkillUpdate(
                name="Skill B",
                description=None,
                is_enabled=False,
                content="Content B",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="b.md",
                        content="B",
                    )
                ],
            ),
        )

        assert updated.name == "Skill B"
        assert [resource.relative for resource in updated.resources] == ["b.md"]

        await skill_repository.delete(updated)
        db_session.expunge_all()

        old_resource = await db_session.scalar(
            select(skill_models.SkillResource).where(
                skill_models.SkillResource.id == old_resource_id
            )
        )
        assert old_resource is None
        assert await skill_repository.get_by_id(updated.id) is None

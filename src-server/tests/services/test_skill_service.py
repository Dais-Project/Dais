import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.skill import (
    SkillService,
    SkillNameAlreadyExistsError,
    SkillNotFoundError,
)


class TestSkillService:
    @pytest.mark.asyncio
    async def test_get_skill_by_id_not_found(self, db_session: AsyncSession):
        service = SkillService(db_session)

        with pytest.raises(SkillNotFoundError) as exc_info:
            await service.get_skill_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.SKILL_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_skill_with_resources(self, db_session: AsyncSession):
        service = SkillService(db_session)
        data = skill_schemas.SkillCreate(
            name="Skill A",
            description="Description A",
            is_enabled=True,
            content="Skill content A",
            resources=[
                skill_schemas.SkillResourceBase(
                    relative="README.md",
                    content="readme-content",
                ),
                skill_schemas.SkillResourceBase(
                    relative="docs/guide.md",
                    content="guide-content",
                ),
            ],
        )

        created = await service.create_skill(data)

        assert created.name == "Skill A"
        assert created.description == "Description A"
        assert created.is_enabled is True
        assert created.content == "Skill content A"
        assert len(created.resources) == 2
        assert {resource.relative for resource in created.resources} == {
            "README.md",
            "docs/guide.md",
        }
        assert created.hash == skill_models.Skill.compute_resources_hash(created.resources)

    @pytest.mark.asyncio
    async def test_create_skill_duplicate_name_conflict(self, db_session: AsyncSession):
        service = SkillService(db_session)
        create_data = skill_schemas.SkillCreate(
            name="Duplicated Skill",
            description="",
            is_enabled=True,
            content="Skill content",
            resources=[],
        )

        await service.create_skill(create_data)

        with pytest.raises(SkillNameAlreadyExistsError) as exc_info:
            await service.create_skill(create_data)

        assert (
            exc_info.value.error_code
            == ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS
        )

    @pytest.mark.asyncio
    async def test_update_skill_updates_fields_and_resources(self, db_session: AsyncSession):
        service = SkillService(db_session)
        created = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="Description A",
                is_enabled=True,
                content="Skill content A",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="old.md",
                        content="old-content",
                    )
                ],
            )
        )
        old_hash = created.hash

        updated = await service.update_skill(
            created.id,
            skill_schemas.SkillUpdate(
                name="Skill B",
                description="Description B",
                is_enabled=False,
                content="Skill content B",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="new.md",
                        content="new-content",
                    ),
                    skill_schemas.SkillResourceBase(
                        relative="nested/new-2.md",
                        content="new-content-2",
                    ),
                ],
            ),
        )

        assert updated.name == "Skill B"
        assert updated.description == "Description B"
        assert updated.is_enabled is False
        assert updated.content == "Skill content B"
        assert len(updated.resources) == 2
        assert {resource.relative for resource in updated.resources} == {
            "new.md",
            "nested/new-2.md",
        }
        assert updated.hash == skill_models.Skill.compute_resources_hash(updated.resources)
        assert updated.hash != old_hash

    @pytest.mark.asyncio
    async def test_update_skill_duplicate_name_conflict(self, db_session: AsyncSession):
        service = SkillService(db_session)
        skill_a = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="",
                is_enabled=True,
                content="Content A",
                resources=[],
            )
        )
        skill_b = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill B",
                description="",
                is_enabled=True,
                content="Content B",
                resources=[],
            )
        )

        with pytest.raises(SkillNameAlreadyExistsError) as exc_info:
            await service.update_skill(
                skill_b.id,
                skill_schemas.SkillUpdate(name=skill_a.name),
            )

        assert (
            exc_info.value.error_code
            == ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS
        )

    @pytest.mark.asyncio
    async def test_delete_skill_removes_entity(self, db_session: AsyncSession):
        service = SkillService(db_session)
        created = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="",
                is_enabled=True,
                content="Skill content",
                resources=[],
            )
        )

        await service.delete_skill(created.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(SkillNotFoundError):
            await service.get_skill_by_id(created.id)

    @pytest.mark.asyncio
    async def test_get_all_skills_orders_by_id_and_loads_resources(
        self,
        db_session: AsyncSession,
    ):
        service = SkillService(db_session)
        first = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill 1",
                description="",
                is_enabled=True,
                content="Content 1",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="a.md",
                        content="A",
                    )
                ],
            )
        )
        second = await service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill 2",
                description="",
                is_enabled=True,
                content="Content 2",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="b.md",
                        content="B",
                    )
                ],
            )
        )

        db_session.expunge_all()

        skills = await service.get_all_skills()

        assert [skill.id for skill in skills] == [first.id, second.id]
        assert [len(skill.resources) for skill in skills] == [1, 1]
        assert skills[0].resources[0].relative == "a.md"
        assert skills[1].resources[0].relative == "b.md"

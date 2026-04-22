import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.skill import (
    SkillNameAlreadyExistsError,
    SkillNotFoundError,
    SkillService,
)


@pytest.fixture
def skill_service(db_session: AsyncSession) -> SkillService:
    return SkillService(db_session)


@pytest.mark.service
@pytest.mark.integration
class TestSkillService:
    @pytest.mark.asyncio
    async def test_get_skill_by_id_not_found(self, skill_service: SkillService):
        with pytest.raises(SkillNotFoundError, match="Skill '999' not found") as exc_info:
            await skill_service.get_skill_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.SKILL_NOT_FOUND

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "resources",
        [
            [
                skill_schemas.SkillResourceBase(
                    relative="README.md",
                    content="readme-content",
                )
            ],
            [
                skill_schemas.SkillResourceBase(
                    relative="README.md",
                    content="readme-content",
                ),
                skill_schemas.SkillResourceBase(
                    relative="docs/guide.md",
                    content="guide-content",
                ),
            ],
        ],
        ids=["single-resource", "nested-resources"],
    )
    async def test_create_skill_with_resources(
        self,
        skill_service: SkillService,
        resources: list[skill_schemas.SkillResourceBase],
    ):
        created = await skill_service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="Description A",
                is_enabled=True,
                content="Skill content A",
                resources=resources,
            )
        )

        assert created.name == "Skill A"
        assert created.description == "Description A"
        assert created.is_enabled is True
        assert created.content == "Skill content A"
        assert [resource.relative for resource in created.resources] == [resource.relative for resource in resources]
        assert created.hash == skill_models.Skill.compute_resources_hash(created.resources)

    @pytest.mark.asyncio
    async def test_create_skill_duplicate_name_conflict(self, skill_service: SkillService):
        create_data = skill_schemas.SkillCreate(
            name="Duplicated Skill",
            description="",
            is_enabled=True,
            content="Skill content",
            resources=[],
        )

        await skill_service.create_skill(create_data)

        with pytest.raises(
            SkillNameAlreadyExistsError,
            match="Skill 'Duplicated Skill' already exists",
        ) as exc_info:
            await skill_service.create_skill(create_data)

        assert exc_info.value.error_code == ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS

    @pytest.mark.asyncio
    async def test_update_skill_updates_fields_and_resources(self, skill_service: SkillService):
        created = await skill_service.create_skill(
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

        updated = await skill_service.update_skill(
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
    async def test_update_skill_duplicate_name_conflict(
        self,
        skill_service: SkillService,
        skill_factory,
    ):
        skill_a = await skill_factory(name="Skill A", content="Content A")
        skill_b = await skill_factory(name="Skill B", content="Content B")

        with pytest.raises(
            SkillNameAlreadyExistsError,
            match="Skill 'Skill A' already exists",
        ) as exc_info:
            await skill_service.update_skill(
                skill_b.id,
                skill_schemas.SkillUpdate(name=skill_a.name),
            )

        assert exc_info.value.error_code == ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS

    @pytest.mark.asyncio
    async def test_delete_skill_removes_entity_and_resource_children(
        self,
        skill_service: SkillService,
        db_session: AsyncSession,
    ):
        created = await skill_service.create_skill(
            skill_schemas.SkillCreate(
                name="Skill A",
                description="",
                is_enabled=True,
                content="Skill content",
                resources=[
                    skill_schemas.SkillResourceBase(
                        relative="README.md",
                        content="resource-content",
                    )
                ],
            )
        )
        resource_id = created.resources[0].id

        await skill_service.delete_skill(created.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(SkillNotFoundError, match=f"Skill '{created.id}' not found"):
            await skill_service.get_skill_by_id(created.id)

        resource_in_db = await db_session.scalar(
            select(skill_models.SkillResource).where(skill_models.SkillResource.id == resource_id)
        )
        assert resource_in_db is None

    @pytest.mark.asyncio
    async def test_get_all_skills_orders_by_id_and_loads_resources(
        self,
        skill_service: SkillService,
        db_session: AsyncSession,
    ):
        first = await skill_service.create_skill(
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
        second = await skill_service.create_skill(
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

        skills = await skill_service.get_all_skills()

        assert [skill.id for skill in skills] == [first.id, second.id]
        assert [len(skill.resources) for skill in skills] == [1, 1]
        assert skills[0].resources[0].relative == "a.md"
        assert skills[1].resources[0].relative == "b.md"

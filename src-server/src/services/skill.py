from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas
from .service_base import ServiceBase
from .exceptions import NotFoundError, ConflictError, ServiceErrorCode
from .utils import build_load_options, Relations


class SkillNotFoundError(NotFoundError):
    def __init__(self, skill_identifier: int | str) -> None:
        super().__init__(ServiceErrorCode.SKILL_NOT_FOUND, "Skill", skill_identifier)

class SkillNameAlreadyExistsError(ConflictError):
    def __init__(self, name: str) -> None:
        super().__init__(
            ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS,
            f"Skill '{name}' already exists",
        )

class SkillService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [skill_models.Skill.resources]

    def get_skills_query(self):
        return (
            select(skill_models.Skill)
            .order_by(skill_models.Skill.id.asc())
            .options(selectinload(skill_models.Skill.resources))
        )

    async def get_all_skills(self) -> list[skill_models.Skill]:
        stmt = (
            select(skill_models.Skill)
            .order_by(skill_models.Skill.id.asc())
            .options(*build_load_options(self.relations()))
        )
        skills = (await self._db_session.scalars(stmt)).all()
        return list(skills)

    async def get_skill_by_id(self, id: int) -> skill_models.Skill:
        skill = await self._db_session.get(
            skill_models.Skill,
            id,
            options=build_load_options(self.relations()),
        )
        if not skill:
            raise SkillNotFoundError(id)
        return skill

    async def get_skill_by_name(self, name: str) -> skill_models.Skill:
        stmt = (
            select(skill_models.Skill)
            .where(skill_models.Skill.name == name)
            .options(*build_load_options(self.relations()))
        )
        skill = await self._db_session.scalar(stmt)
        if not skill:
            raise SkillNotFoundError(name)
        return skill

    async def create_skill(self, data: skill_schemas.SkillCreate) -> skill_models.Skill:
        try:
            await self.get_skill_by_name(data.name)
            raise SkillNameAlreadyExistsError(data.name)
        except SkillNotFoundError: pass

        resources = [
            skill_models.SkillResource(
                relative=res.relative,
                content=res.content,
            )
            for res in data.resources
        ]
        new_skill = skill_models.Skill(
            name=data.name,
            hash=skill_models.Skill.compute_resources_hash(resources),
            description=data.description,
            is_enabled=data.is_enabled,
            content=data.content,
            resources=resources,
        )

        self._db_session.add(new_skill)
        await self._db_session.flush()

        new_skill = await self.get_skill_by_id(new_skill.id)
        return new_skill

    async def update_skill(
        self, id: int, data: skill_schemas.SkillUpdate
    ) -> skill_models.Skill:
        updated_skill = await self.get_skill_by_id(id)

        if data.name is not None and data.name != updated_skill.name:
            try:
                await self.get_skill_by_name(data.name)
                raise SkillNameAlreadyExistsError(data.name)
            except SkillNotFoundError:
                pass

        self.apply_fields(updated_skill, data, exclude={"resources"})

        if data.resources is not None:
            resources = [
                skill_models.SkillResource(
                    relative=res.relative,
                    content=res.content,
                )
                for res in data.resources
            ]
            updated_skill.hash = skill_models.Skill.compute_resources_hash(resources)
            updated_skill.resources = resources

        await self._db_session.flush()
        self._db_session.expunge(updated_skill)

        updated_skill = await self.get_skill_by_id(updated_skill.id)
        return updated_skill

    async def delete_skill(self, id: int) -> None:
        skill = await self.get_skill_by_id(id)
        await self._db_session.delete(skill)
        await self._db_session.flush()

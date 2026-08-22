from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import skill as skill_models
from src.repositories.skill import SkillRepository
from src.schemas import skill as skill_schemas

from .exceptions import ConflictError, NotFoundError, ServiceErrorCode


class SkillNotFoundError(NotFoundError):
    def __init__(self, skill_identifier: int | str):
        super().__init__(ServiceErrorCode.SKILL_NOT_FOUND, "Skill", skill_identifier)


class SkillNameAlreadyExistsError(ConflictError):
    def __init__(self, name: str):
        super().__init__(
            ServiceErrorCode.SKILL_NAME_ALREADY_EXISTS,
            f"Skill '{name}' already exists",
        )


class SkillService:
    def __init__(self, repository: SkillRepository):
        self._repository = repository

    @classmethod
    def from_db_session(cls, db_session: AsyncSession) -> SkillService:
        return cls(SkillRepository(db_session))

    async def get_skills_page(self, query: str | None = None):
        return await self._repository.get_page(query)

    async def get_all_skills(self) -> list[skill_models.Skill]:
        return await self._repository.get_all()

    async def get_skill_by_id(self, skill_id: int) -> skill_models.Skill:
        skill = await self._repository.get_by_id(skill_id)
        if skill is None:
            raise SkillNotFoundError(skill_id)
        return skill

    async def get_skill_by_name(self, name: str) -> skill_models.Skill:
        skill = await self._repository.get_by_name(name)
        if skill is None:
            raise SkillNotFoundError(name)
        return skill

    async def create_skill(self, data: skill_schemas.SkillCreate) -> skill_models.Skill:
        if await self._repository.get_by_name(data.name) is not None:
            raise SkillNameAlreadyExistsError(data.name)
        skill = await self._repository.create(data)
        await self.rematerialize_skill(skill)
        return skill

    async def update_skill(self, skill_id: int, data: skill_schemas.SkillUpdate) -> skill_models.Skill:
        skill = await self.get_skill_by_id(skill_id)
        if data.name is not None and data.name != skill.name:
            if await self._repository.get_by_name(data.name) is not None:
                raise SkillNameAlreadyExistsError(data.name)
        updated = await self._repository.update(skill, data)
        await self.rematerialize_skill(updated)
        return updated

    async def delete_skill(self, skill_id: int):
        from src.agent.skills import SkillMaterializer

        skill = await self.get_skill_by_id(skill_id)
        await self._repository.delete(skill)
        await SkillMaterializer.clear_materialized(skill_id)

    async def create_skills_ignoring_duplicates(self, data_items: list[skill_schemas.SkillCreate]) -> list[skill_models.Skill]:
        created: list[skill_models.Skill] = []
        for data in data_items:
            try:
                created.append(await self.create_skill(data))
            except SkillNameAlreadyExistsError:
                continue
        return created

    @staticmethod
    async def rematerialize_skill(skill: skill_models.Skill):
        from src.agent.skills import SkillMaterializer

        skill_data = skill_schemas.SkillRead.model_validate(skill)
        await SkillMaterializer.clear_materialized(skill.id)
        await SkillMaterializer.materialize(skill_data)

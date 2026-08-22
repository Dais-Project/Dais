from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas

from .repository_base import RepositoryBase


class SkillRepository(RepositoryBase[skill_models.Skill]):
    @staticmethod
    def relations():
        return [selectinload(skill_models.Skill.resources)]

    def get_query(self, query: str | None = None):
        stmt = (
            select(skill_models.Skill)
            .order_by(skill_models.Skill.id.asc())
            .options(*self.relations())
        )
        if query:
            search_term = f"%{query}%"
            stmt = stmt.where(
                skill_models.Skill.name.ilike(search_term)
                | skill_models.Skill.description.ilike(search_term)
            )
        return stmt

    async def get_page(self, query: str | None = None):
        return await apaginate(self._db_session, self.get_query(query))

    async def get_all(self) -> list[skill_models.Skill]:
        skills = (await self._db_session.scalars(self.get_query())).all()
        return list(skills)

    async def get_by_id(self, skill_id: int) -> skill_models.Skill | None:
        return await self._db_session.get(
            skill_models.Skill,
            skill_id,
            options=self.relations(),
        )

    async def get_by_name(self, name: str) -> skill_models.Skill | None:
        return await self._db_session.scalar(
            select(skill_models.Skill)
            .where(skill_models.Skill.name == name)
            .options(*self.relations())
        )

    async def create(self, data: skill_schemas.SkillCreate) -> skill_models.Skill:
        resources = self._create_resources(data.resources)
        skill = skill_models.Skill(
            name=data.name,
            hash=skill_models.Skill.compute_resources_hash(resources),
            description=data.description,
            is_enabled=data.is_enabled,
            content=data.content,
            resources=resources,
        )
        self._db_session.add(skill)
        skill_id = await self.flush_and_expunge(skill)
        created = await self.get_by_id(skill_id)
        assert created is not None
        return created

    async def update(
        self,
        skill: skill_models.Skill,
        data: skill_schemas.SkillUpdate,
    ) -> skill_models.Skill:
        self.apply_fields(skill, data, exclude={"resources"})
        if data.resources is not None:
            resources = self._create_resources(data.resources)
            skill.hash = skill_models.Skill.compute_resources_hash(resources)
            skill.resources = resources
        skill_id = await self.flush_and_expunge(skill)
        updated = await self.get_by_id(skill_id)
        assert updated is not None
        return updated

    async def delete(self, skill: skill_models.Skill):
        await self._db_session.delete(skill)
        await self._db_session.flush()

    @staticmethod
    def _create_resources(
        resources: list[skill_schemas.SkillResourceBase],
    ) -> list[skill_models.SkillResource]:
        return [
            skill_models.SkillResource(
                relative=resource.relative,
                content=resource.content,
            )
            for resource in resources
        ]

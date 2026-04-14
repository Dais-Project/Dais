import asyncio
import inspect
import os
import shutil
from anyio import Path
from loguru import logger
from src.common import DATA_DIR
from src.db import db_context
from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas
from src.services.skill import SkillService


class SkillMaterializer:
    _logger = logger.bind(name="SkillMaterializer")
    SKILLS_DIR_ENVNAME = "DAIS_SKILLS_DIR"

    @staticmethod
    def get_skill_dir_env() -> dict[str, str]:
        return {SkillMaterializer.SKILLS_DIR_ENVNAME: str(DATA_DIR / ".skills")}

    @staticmethod
    def inject_skill_dir_env():
        skill_dir_env = SkillMaterializer.get_skill_dir_env()
        os.environ.update(skill_dir_env)

    @staticmethod
    async def get_skills_dir() -> Path:
        path = Path(DATA_DIR, ".skills")
        await path.mkdir(exist_ok=True)
        return path

    @staticmethod
    async def get_skill_dir(skill: skill_schemas.SkillRead) -> Path:
        skills_dir = await SkillMaterializer.get_skills_dir()
        skill_dir = skills_dir / str(skill.id)
        await skill_dir.mkdir(parents=True, exist_ok=True)
        return skill_dir

    @classmethod
    async def materialize_skill(cls, skill: skill_schemas.SkillRead) -> Path:
        """
        Materialize a skill to a temporary directory and return the directory absolute path.
        """
        skill_dir = await cls.get_skill_dir(skill)
        skill_md = skill_dir / "SKILL.md"
        skill_md_content_template = inspect.cleandoc(
        """
        ---
        name: {skill.name}
        description: {skill.description}
        ---

        {skill.content}
        """)
        await skill_md.write_text(
            skill_md_content_template.format(skill=skill).strip(),
            "utf-8")
        for resource in skill.resources:
            resource_path = skill_dir / resource.relative
            await resource_path.parent.mkdir(parents=True, exist_ok=True)
            await resource_path.write_text(resource.content, "utf-8")
        return skill_dir

    @classmethod
    async def materialize_skills(cls):
        async with db_context() as db_session:
            skills = await SkillService(db_session).get_all_skills()

        sem = asyncio.Semaphore(16)
        async def sem_materialize(skill: skill_models.Skill):
            async with sem:
                skill_read = skill_schemas.SkillRead.model_validate(skill)
                await cls.clear_materialized(skill_read)
                await cls.materialize_skill(skill_read)
        tasks = [sem_materialize(skill) for skill in skills]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, BaseException):
                cls._logger.opt(exception=result).warning("Failed to materialize skill")

    @classmethod
    async def clear_materialized(cls, skill: skill_schemas.SkillRead):
        skills_dir = await cls.get_skills_dir()
        skill_dir = skills_dir / str(skill.id)
        if not await skill_dir.exists(): return
        await asyncio.to_thread(shutil.rmtree, skill_dir)

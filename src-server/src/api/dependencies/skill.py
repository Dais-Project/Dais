from typing import Annotated

from fastapi import Depends

from src.services.skill import SkillService

from .db_session import DbSessionDep


def get_skill_service(db_session: DbSessionDep) -> SkillService:
    return SkillService.from_db_session(db_session)


SkillServiceDep = Annotated[SkillService, Depends(get_skill_service)]

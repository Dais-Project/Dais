from typing import Annotated

from fastapi import Depends

from src.repositories.skill import SkillRepository
from src.services.skill import SkillService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_skill_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> SkillService:
    return SkillService(
        SkillRepository(db_session),
        on_resource_changed,
    )


SkillServiceDep = Annotated[SkillService, Depends(get_skill_service)]

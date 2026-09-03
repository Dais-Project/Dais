from typing import Annotated

from fastapi import Depends

from src.repositories.provider import ProviderRepository
from src.services.llm_model import LlmModelService
from src.services.provider import ProviderService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_provider_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> ProviderService:
    return ProviderService(
        ProviderRepository(db_session),
        on_resource_changed,
    )


ProviderServiceDep = Annotated[ProviderService, Depends(get_provider_service)]


def get_llm_model_service(db_session: DbSessionDep) -> LlmModelService:
    return LlmModelService.from_db_session(db_session)


LlmModelServiceDep = Annotated[LlmModelService, Depends(get_llm_model_service)]

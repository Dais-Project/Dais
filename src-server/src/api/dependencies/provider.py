from typing import Annotated

from fastapi import Depends

from src.services.llm_model import LlmModelService
from src.services.provider import ProviderService

from .db_session import DbSessionDep


def get_provider_service(db_session: DbSessionDep) -> ProviderService:
    return ProviderService.from_db_session(db_session)


ProviderServiceDep = Annotated[ProviderService, Depends(get_provider_service)]


def get_llm_model_service(db_session: DbSessionDep) -> LlmModelService:
    return LlmModelService.from_db_session(db_session)


LlmModelServiceDep = Annotated[LlmModelService, Depends(get_llm_model_service)]

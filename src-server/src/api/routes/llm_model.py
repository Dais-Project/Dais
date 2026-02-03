from typing import Annotated
from fastapi import APIRouter, Depends
from ...services.llm_model import LlmModelService
from ...db.schemas import provider as provider_schemas

llm_models_router = APIRouter()

def get_llm_model_service():
    with LlmModelService() as service:
        yield service

LlmModelServiceDep = Annotated[LlmModelService, Depends(get_llm_model_service)]

@llm_models_router.get("/{model_id}", response_model=provider_schemas.LlmModelRead)
def get_model_by_id(model_id: int, service: LlmModelServiceDep):
    model = service.get_model_by_id(model_id)
    return provider_schemas.LlmModelRead.model_validate(model)

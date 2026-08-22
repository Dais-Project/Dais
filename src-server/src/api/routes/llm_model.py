from fastapi import APIRouter

from src.schemas import provider as provider_schemas

from ..dependencies import LlmModelServiceDep


llm_models_router = APIRouter(tags=["llm-model"])

@llm_models_router.get(
    "/{model_id}",
    response_model=provider_schemas.LlmModelRead,
)
async def get_model_by_id(service: LlmModelServiceDep, model_id: int):
    return await service.get_model_by_id(model_id)

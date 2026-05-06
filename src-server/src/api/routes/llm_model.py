from fastapi import APIRouter
from src.services.llm_model import LlmModelService
from src.schemas import provider as provider_schemas
from ..dependencies import DbSessionDep


llm_models_router = APIRouter(tags=["llm_model"])

@llm_models_router.get("/{model_id}", response_model=provider_schemas.LlmModelRead)
async def get_model_by_id(model_id: int, db_session: DbSessionDep):
    return await LlmModelService(db_session).get_model_by_id(model_id)

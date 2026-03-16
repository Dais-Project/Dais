from fastapi import APIRouter, Depends
from pydantic import BaseModel
from dais_sdk import LLM
from dais_sdk.providers import LlmProviders


llm_api_router = APIRouter(tags=["llm_api"])

class FetchModelsParams(BaseModel):
    base_url: str
    api_key: str
    type: LlmProviders

class FetchModelsResponse(BaseModel):
    models: list[str]


@llm_api_router.get("/models", response_model=FetchModelsResponse)
async def fetch_models(params: FetchModelsParams = Depends(FetchModelsParams)):
    provider = LLM.create_provider(params.type, params.base_url, api_key=params.api_key)
    models = await provider.list_models()
    return FetchModelsResponse(models=models)

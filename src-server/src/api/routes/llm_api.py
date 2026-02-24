import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from dais_sdk import LLM, LlmProviders

llm_api_router = APIRouter(tags=["llm_api"])


class FetchModelsParams(BaseModel):
    base_url: str
    api_key: str
    type: LlmProviders

class FetchModelsResponse(BaseModel):
    models: list[str]


@llm_api_router.get("/models", response_model=FetchModelsResponse)
async def fetch_models(params: FetchModelsParams = Depends(FetchModelsParams)):
    llm = LLM(
        provider=params.type,
        base_url=params.base_url,
        api_key=params.api_key,
    )
    models = await asyncio.to_thread(llm.list_models)
    return FetchModelsResponse(models=models)

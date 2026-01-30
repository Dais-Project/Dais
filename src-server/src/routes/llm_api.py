from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from dais_sdk import LLM, LlmProviders

llm_api_router = APIRouter()

class FetchModelsBody(BaseModel):
    base_url: str
    api_key: str
    type: LlmProviders

@llm_api_router.post("/models", response_model=list[str])
def fetch_models(body: FetchModelsBody):
    llm = LLM(
        provider=body.type,
        base_url=body.base_url,
        api_key=body.api_key)
    return llm.list_models()

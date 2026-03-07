from typing import Self
from dais_sdk import LLM
from dais_sdk.providers import OpenAIProvider
from dais_sdk.types import LlmRequestParams, SystemMessage, UserMessage, AssistantMessage
from ..db import db_context
from ..db.models import provider as provider_models
from ..services.llm_model import LlmModelService

class TempGeneration:
    def __init__(self, instruction: str, model_name: str, provider: provider_models.Provider) -> None:
        self._instruction = instruction
        self._model_name = model_name
        self._provider = provider

    @classmethod
    async def create(cls, instruction: str, model_id: int) -> Self:
        async with db_context() as db_session:
            model = await LlmModelService(db_session).get_model_by_id(model_id)
            provider = model.provider
        return cls(instruction, model.name, provider)

    def _request_param_factory(self, input: str) -> LlmRequestParams:
        return LlmRequestParams(
            model=self._model_name,
            messages=[
                SystemMessage(content=self._instruction),
                UserMessage(content=input),
            ],
            tool_choice="none")

    async def generate(self, input: str) -> str | None:
        provider = OpenAIProvider(self._provider.base_url, api_key=self._provider.api_key)
        llm = LLM(provider=provider)
        request_params = self._request_param_factory(input)
        message = await llm.generate_text(request_params)
        return message.content

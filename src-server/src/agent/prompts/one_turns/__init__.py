from dais_sdk import LLM
from ....db import db_context
from ....services.llm_model import LlmModelService

from .file_analyze import SemanticFileAnalysis, SemanticFileAnalysisInput
from .title_summarization import TitleSummarization
from .tool_call_safety_audit import ToolCallSafetyAudit, ToolCallSafetyAuditInput, ToolCallSafetyAuditOutput

async def create_one_turn_llm(model_id: int) -> LLM:
    async with db_context() as db_session:
        model = await LlmModelService(db_session).get_model_by_id(model_id)
        provider = model.provider
    provider = LLM.create_provider(provider.type,
                                                 provider.base_url,
                                                 api_key=provider.api_key)
    return LLM(model.name, provider=provider)

__all__ = [
    "create_one_turn_llm",
    "SemanticFileAnalysis", "SemanticFileAnalysisInput",
    "TitleSummarization",
    "ToolCallSafetyAudit",
    "ToolCallSafetyAuditInput",
    "ToolCallSafetyAuditOutput",
]

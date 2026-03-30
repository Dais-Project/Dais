import asyncio
import uuid
from collections.abc import AsyncGenerator
from loguru import logger
from dais_sdk import LLM
from dais_sdk.types import (
    LlmRequestParams,
    AssistantMessageEvent,
    TextChunkEvent as SdkTextChunkEvent,
    UsageChunkEvent as SdkUsageChunkEvent,
    ToolCallChunkEvent as SdkToolCallChunkEvent,
)
from ..context import AgentContext
from ..types import (
    MessageStartEvent, MessageEndEvent,
    TextChunkEvent, ToolCallChunkEvent, UsageChunkEvent,
    ToolCallEndEvent,
    TaskInterruptedEvent, ErrorEvent
)


class LlmRequestManager:
    _logger = logger.bind(name="LlmRequestManager")

    def __init__(self, ctx: AgentContext):
        self._ctx = ctx
        self._current_stream: AsyncGenerator | None = None

    def _llm_factory(self) -> LLM:
        provider = LLM.create_provider(self._ctx.provider.type,
                                                     self._ctx.provider.base_url,
                                                     api_key=self._ctx.provider.api_key)
        return LLM(self._ctx.model.name, provider=provider)

    def _create_request_param(self) -> LlmRequestParams:
        params = LlmRequestParams(
            instructions=self._ctx.system_instruction,
            messages=self._ctx.messages)
        usable_tool_ids = self._ctx.usable_tool_ids
        if usable_tool_ids is None:
            # both agent and workspace has no usable tools configured, use all tools
            params.toolsets = self._ctx.toolsets
            params.tool_choice = "auto"
        elif len(usable_tool_ids) == 0:
            params.tool_choice = "none"
        else:
            params.tools = [tool
                            for toolset in self._ctx.toolsets
                            for tool in toolset.get_tools()
                            if tool.metadata["id"] in usable_tool_ids]
            params.tool_choice = "auto"

        return params

    async def create_llm_call(self) -> AsyncGenerator[MessageStartEvent
                                                    | TextChunkEvent
                                                    | ToolCallChunkEvent
                                                    | UsageChunkEvent
                                                    | MessageEndEvent
                                                    | ToolCallEndEvent
                                                    | TaskInterruptedEvent
                                                    | ErrorEvent, None]:
        """
        Create LLM API call, put message chunks into chunk_queue and return the first tool call message
        """
        assistant_message_id = str(uuid.uuid4())
        request_params = self._create_request_param()
        llm = self._llm_factory()
        try:
            self._current_stream = llm.stream_text(request_params)
            yield MessageStartEvent(message_id=assistant_message_id)
            async for chunk in self._current_stream:
                match chunk:
                    case SdkTextChunkEvent() as chunk:
                        yield TextChunkEvent.from_sdk(chunk, assistant_message_id)
                    case SdkToolCallChunkEvent() as chunk:
                        yield ToolCallChunkEvent.from_sdk(chunk)
                    case SdkUsageChunkEvent() as chunk:
                        self._ctx.usage.accumulate(chunk)
                        yield UsageChunkEvent.from_task_usage(self._ctx.usage)
                    case AssistantMessageEvent(message):
                        message.id = assistant_message_id
                        yield MessageEndEvent.from_sdk(message)
        except asyncio.CancelledError:
            yield TaskInterruptedEvent()
            raise
        except Exception as e:
            self._logger.exception(f"Failed to create llm call.")
            yield ErrorEvent(error=str(e))
        finally:
            self._current_stream = None
            await asyncio.shield(llm.close())

    async def cancel(self):
        if self._current_stream is not None:
            await self._current_stream.aclose()

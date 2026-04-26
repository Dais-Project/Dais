import asyncio
import uuid
from typing import override
from collections.abc import AsyncGenerator
from anyio import Path
from loguru import logger
from dais_sdk import LLM
from dais_sdk.types import (
    ContentBlock, ContentBlockMetadata, ContentBlockResolver,
    ProviderNetworkError, ProviderRateLimitError, ProviderServerError, ProviderTimeoutError,
    TextBlock, ImageBlock, AudioBlock, VideoBlock, DocumentBlock, Base64Source,
    LlmRequestParams,
    AssistantMessageEvent,
    TextChunkEvent as SdkTextChunkEvent,
    UsageChunkEvent as SdkUsageChunkEvent,
    ToolCallChunkEvent as SdkToolCallChunkEvent,
)
from src.db import db_context
from src.services.tasks import TaskResourceService
from src.schemas.tasks import runtime as task_runtime_schemas
from src.utils import MarkdownConverter, to_base64_str
from ..context import AgentContext
from ..types import (
    is_task_resource_metadata, TaskResourceMetadata,
    MessageStartEvent, MessageEndEvent,
    TextChunkEvent, ToolCallChunkEvent, UsageChunkEvent,
    ToolCallEndEvent,
    TaskInterruptedEvent, ErrorEvent
)
from ..utils import get_magika, normalize_content_type


class TaskResourceRetriever(ContentBlockResolver):
    _logger = logger.bind(name="TaskResourceRetriever")

    def __init__(self, task_id: int):
        self._task_id = task_id
        self._magika = get_magika()
        self._markdown_converter = MarkdownConverter()
        super().__init__()

    async def _is_resource_convertable(self, path: Path) -> bool:
        if MarkdownConverter.is_convertable_binary(path):
            return True
        result = await asyncio.to_thread(self._magika.identify_path, path)
        return MarkdownConverter.is_convertable_binary(result.output.label)

    async def _convert_to_markdown_cached(self, path: Path) -> str:
        markdowned_path = path.with_name(path.name + ".md")
        if await markdowned_path.exists():
            return await markdowned_path.read_text("utf-8")
        result = await self._markdown_converter.convert(path)
        await markdowned_path.write_text(result, "utf-8")
        return result

    async def _resolve_resource(self, metadata: TaskResourceMetadata) -> ContentBlock | None:
        async with db_context() as db_session:
            resource_path = await TaskResourceService(db_session, task_runtime_schemas.TaskType.TASK).load_task_resource(self._task_id, metadata["resource_id"])
            if resource_path is None: return None

            normalized_resource_type = normalize_content_type(metadata["mimetype"])
            if normalized_resource_type == "text": return TextBlock(text=await resource_path.read_text("utf-8"))

            resource_bytes = await resource_path.read_bytes()
            resource_base64 = await asyncio.to_thread(to_base64_str, resource_bytes)
            source = Base64Source(mime_type=metadata["mimetype"], data=resource_base64)
            match normalized_resource_type:
                case "image": return ImageBlock(source=source)
                case "audio": return AudioBlock(source=source)
                case "video": return VideoBlock(source=source)
                case "document":
                    if await self._is_resource_convertable(resource_path):
                        markdowned = await self._convert_to_markdown_cached(resource_path)
                        return TextBlock(text=markdowned)
                    return DocumentBlock(source=source)

    @override
    async def resolve(self, metadata: ContentBlockMetadata) -> list[ContentBlock] | ContentBlock | None:
        assert is_task_resource_metadata(metadata)
        file_block = await self._resolve_resource(metadata)
        if file_block is None: return None

        attachment_start_block = TextBlock(text=f"<attachment filename=\"{metadata['filename']}\">")
        attachment_end_block = TextBlock(text="</attachment>")
        return [attachment_start_block, file_block, attachment_end_block]

class LlmRequestManager:
    _logger = logger.bind(name="LlmRequestManager")
    FINISHING_CHUNK_TYPE = MessageEndEvent, TaskInterruptedEvent, ErrorEvent

    def __init__(self, ctx: AgentContext):
        self._ctx = ctx
        self._current_stream: AsyncGenerator | None = None

    def _llm_factory(self) -> LLM:
        provider = LLM.create_provider(self._ctx.provider.type,
                                                     self._ctx.provider.base_url,
                                                     api_key=self._ctx.provider.api_key)
        return LLM(self._ctx.model.name, provider, TaskResourceRetriever(self._ctx.task_id))

    async def _create_request_param(self) -> LlmRequestParams:
        params = LlmRequestParams(
            instructions=await self._ctx.compose_system_instruction(),
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
        request_params = await self._create_request_param()
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
            retryable = isinstance(e, (ProviderRateLimitError, ProviderServerError, ProviderTimeoutError, ProviderNetworkError))
            yield ErrorEvent(error=str(e), retryable=retryable)
        finally:
            self._current_stream = None
            await asyncio.shield(llm.close())

    async def cancel(self):
        if self._current_stream is not None:
            await self._current_stream.aclose()

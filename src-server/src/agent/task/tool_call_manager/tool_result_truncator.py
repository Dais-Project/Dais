from anyio import Path
from typing import cast

from dais_sdk.types import ContentBlockMetadata, ToolMessage

from src.db import db_context
from src.schemas.tasks import TaskType
from src.services.tasks import TaskResourceService

from ...types import TextResourceMetadata, UrlResourceMetadata, FileResourceMetadata, is_agent_tool_metadata


class ToolResultTruncator:
    TOOL_RESULT_CHAR_LIMIT = 40000

    def __init__(self, task_id: int, task_type: TaskType):
        self._task_id = task_id
        self._task_type = task_type

    @staticmethod
    def count(result: str | list[ContentBlockMetadata]) -> int:
        if isinstance(result, str): return len(result)
        blocks = cast(list[TextResourceMetadata | UrlResourceMetadata | FileResourceMetadata], result)
        return sum(len(block["text"])
                   for block in blocks
                   if "text" in block)

    @staticmethod
    def _create_materialized_file_name(call_id: str, index: int | None = None) -> str:
        if index is None:
            return f"tool-output_{call_id}.txt"
        return f"tool-output_{call_id}_{index}.txt"

    @staticmethod
    def _create_truncated_marker(file_path: str) -> str:
        return f"\n\n[Tool output truncated. Complete output is stored in {file_path}.]"

    @staticmethod
    def _truncate_text(text: str, marker: str, limit: int) -> str:
        if len(text) <= limit: return text
        prefix_length = max(0, limit - len(marker))
        return text[:prefix_length] + marker

    async def materialize(self, filename: str, content: str) -> Path | None:
        async with db_context() as db_session:
            task_resource_service = TaskResourceService.from_db_session(db_session, self._task_type)
            resource = await task_resource_service.save_task_resource(
                self._task_id,
                filename,
                content.encode("utf-8"),
            )
            return await task_resource_service.load_task_resource(
                self._task_id, resource.id)

    async def truncate(self, message: ToolMessage):
        if message.result is None: return

        text_length = ToolResultTruncator.count(message.result)
        if text_length <= ToolResultTruncator.TOOL_RESULT_CHAR_LIMIT:
            return

        assert is_agent_tool_metadata(message.metadata)

        if isinstance(message.result, str):
            materialized_file_name = ToolResultTruncator._create_materialized_file_name(message.call_id)
            materialized_path = await self.materialize(materialized_file_name, message.result)
            if materialized_path is None: return
            marker = ToolResultTruncator._create_truncated_marker(str(materialized_path))
            message.metadata["original_result"] = message.result
            message.result = ToolResultTruncator._truncate_text(message.result, marker, ToolResultTruncator.TOOL_RESULT_CHAR_LIMIT)
            return

        remaining = ToolResultTruncator.TOOL_RESULT_CHAR_LIMIT
        truncated_blocks: list[ContentBlockMetadata] = []
        for index, block in enumerate(message.result):
            block = cast(TextResourceMetadata | UrlResourceMetadata | FileResourceMetadata, block)
            if "text" not in block: # skip non-text blocks
                truncated_blocks.append(block)
                continue

            materialized_file_name = ToolResultTruncator._create_materialized_file_name(message.call_id, index)
            materialized_path = await self.materialize(materialized_file_name, block["text"])
            if materialized_path is None:
                truncated_blocks.append(block)
                continue
            marker = ToolResultTruncator._create_truncated_marker(str(materialized_path))
            truncated = ToolResultTruncator._truncate_text(block["text"], marker, remaining)
            truncated_blocks.append(TextResourceMetadata(
                resource_id=block["resource_id"],
                text=truncated
            ))
            remaining -= len(truncated)
    
        message.metadata["original_result"] = message.result
        message.result = truncated_blocks

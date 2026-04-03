import asyncio
import io
from functools import singledispatchmethod
from pathlib import Path
from loguru import logger
from magika import ContentTypeLabel
from markitdown import MarkItDown
from src.db import db_context
from src.services.markdown_cache import MarkdownCacheService
from ...toolset_wrapper.built_in_toolset import BuiltInToolsetContext


class MarkdownConverter:
    def __init__(self, ctx: BuiltInToolsetContext):
        self._md = MarkItDown()
        self._ctx = ctx

    @singledispatchmethod
    @staticmethod
    def is_convertable_binary(value) -> bool:
        logger.warning(f"Unexpected value type: {type(value)}")
        return False

    @is_convertable_binary.register(ContentTypeLabel)
    @staticmethod
    def _(label: ContentTypeLabel) -> bool:
        return label in (ContentTypeLabel.PDF, ContentTypeLabel.DOCX, ContentTypeLabel.PPTX, ContentTypeLabel.XLSX, ContentTypeLabel.EPUB)

    @is_convertable_binary.register(str)
    @staticmethod
    def _(filename: str):
        return Path(filename).suffix.lower() in (".pdf", ".docx", ".pptx", ".xlsx", ".epub")

    @singledispatchmethod
    async def convert(self, source) -> str:
        logger.warning(f"Unexpected value type: {type(source)}")
        return str(source)

    @convert.register(Path)
    async def _(self, path: Path) -> str:
        async with db_context() as db_session:
            markdown_cache_service = MarkdownCacheService(db_session, self._ctx.workspace_id, self._ctx.cwd)
            cached = await markdown_cache_service.get(path)
            if cached is not None: return cached

            result = await asyncio.to_thread(self._md.convert, path)
            converted = result.markdown
            await markdown_cache_service.set(path, converted)
        return converted

    @convert.register(bytes)
    async def _(self, binary: bytes) -> str:
        io_interface = io.BytesIO(binary)
        result = await asyncio.to_thread(self._md.convert, io_interface)
        return result.markdown

import asyncio
import io
from functools import singledispatchmethod
from pathlib import Path as StdPath
from anyio import Path as AnyioPath
from loguru import logger
from magika import ContentTypeLabel
from markitdown import MarkItDown


_markitdown = MarkItDown()

class MarkdownConverter:
    CONVERTABLE_EXTS = (".pdf", ".docx", ".pptx", ".xlsx", ".epub")

    @singledispatchmethod
    @staticmethod
    def is_convertable_binary(value) -> bool:
        logger.warning(f"Unexpected value type: {type(value)}")
        return False

    @is_convertable_binary.register(ContentTypeLabel)
    @staticmethod
    def _(label: ContentTypeLabel) -> bool:
        return label in (ContentTypeLabel.PDF, ContentTypeLabel.DOCX, ContentTypeLabel.PPTX, ContentTypeLabel.XLSX, ContentTypeLabel.EPUB)

    @is_convertable_binary.register(StdPath)
    @is_convertable_binary.register(AnyioPath)
    @staticmethod
    def _(filename: StdPath | AnyioPath) -> bool:
        return filename.suffix.lower() in MarkdownConverter.CONVERTABLE_EXTS


    @singledispatchmethod
    async def convert(self, source) -> str:
        logger.warning(f"Unexpected value type: {type(source)}")
        return str(source)

    @convert.register(StdPath)
    @convert.register(AnyioPath)
    async def _(self, path: StdPath | AnyioPath) -> str:
        path = StdPath(path)
        result = await asyncio.to_thread(_markitdown.convert, path)
        return result.markdown

    @convert.register(bytes)
    async def _(self, binary: bytes) -> str:
        io_interface = io.BytesIO(binary)
        result = await asyncio.to_thread(_markitdown.convert, io_interface)
        return result.markdown

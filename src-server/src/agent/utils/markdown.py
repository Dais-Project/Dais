import io
from functools import singledispatchmethod
from pathlib import Path
from typing import BinaryIO
from loguru import logger
from magika import ContentTypeLabel
from markitdown import MarkItDown


class MarkdownConverter:
    def __init__(self):
        self._md = MarkItDown()

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
    def convert(self, source) -> str:
        logger.warning(f"Unexpected value type: {type(source)}")
        return str(source)

    @convert.register(Path)
    def _(self, path: Path) -> str:
        result = self._md.convert(path)
        return result.markdown

    @convert.register(bytes)
    def _(self, binary: bytes) -> str:
        io_interface = io.BytesIO(binary)
        result = self._md.convert(io_interface)
        return result.markdown

import asyncio
import os
from typing import Literal
from magika import Magika
from magika.types import ContentTypeInfo


_magika = Magika()
def get_magika() -> Magika:
    return _magika

type MagikaGroups = Literal["code", "archive", "application", "document", "image", "text", "executable", "video", "audio", "font", "inode", "unknown"]

async def identify_path(path: str | os.PathLike) -> ContentTypeInfo:
    magika = get_magika()
    detected = await asyncio.to_thread(magika.identify_path, path)
    return detected.output

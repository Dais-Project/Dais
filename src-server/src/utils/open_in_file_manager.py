import asyncio
import os
import platform
from loguru import logger


_logger = logger.bind(name="OpenInFileManager")

async def open_in_file_manager(path: str):
    path = os.path.abspath(path)

    match platform.system():
        case "Windows":
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, os.startfile, path)
        case "Darwin":
            await asyncio.create_subprocess_exec("open", path)
        case "Linux":
            await asyncio.create_subprocess_exec("xdg-open", path)
        case _:
            _logger.error(f"Unsupported platform: {platform.system()}")

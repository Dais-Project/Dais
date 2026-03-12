import sys
import logging
from loguru import logger
from .common import DATA_DIR

class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = sys._getframe(6), 6
        while frame and (depth == 0 or frame.f_code.co_filename == logging.__file__):
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def get_log_level(is_dev: bool):
    return logging.getLevelNamesMapping().get(
        "DEBUG" if is_dev else "INFO",
        logging.DEBUG
    )

def setup_logging(log_level: int):
    # intercept everything at the root logger
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(log_level)

    # remove every other logger's handlers
    # and propagate to root logger
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    for noisy_logger in ("aiosqlite", "httpcore", "httpx", "mcp"):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)

    logger.remove()
    logger.add(sys.stderr)
    logger.add(DATA_DIR / "server.log", rotation="256 MB", mode="w")

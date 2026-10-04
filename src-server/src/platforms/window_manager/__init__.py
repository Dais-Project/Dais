import platform

from loguru import logger

from .windows import (
    restore_without_activate as restore_without_activate_windows,
    configure_dpi_awareness as configure_dpi_awareness_windows,
)


_logger = logger.bind(component="window_manager")

def restore_without_activate(window_id: int):
    match platform.system():
        case "Windows":
            # window_id from cua_driver corresponds to win32 hwnd
            restore_without_activate_windows(window_id)
        case system:
            _logger.warning(f"Platform {system} is not supported")

def configure_dpi_awareness():
    match platform.system():
        case "Windows":
            configure_dpi_awareness_windows()
        case system:
            _logger.warning(f"Platform {system} is not supported")

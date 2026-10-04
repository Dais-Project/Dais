import platform

from .windows import restore_without_activate as restore_without_activate_windows


def restore_without_activate(window_id: int):
    match platform.system():
        case "Windows":
            # window_id from cua_driver corresponds to win32 hwnd
            restore_without_activate_windows(window_id)
        case system:
            raise NotImplementedError(f"Platform {system} is not supported")

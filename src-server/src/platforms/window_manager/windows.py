import win32con
import win32gui

def restore_without_activate(hwnd: int):
    if win32gui.IsIconic(hwnd):
        win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)

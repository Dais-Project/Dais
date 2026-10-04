def restore_without_activate(hwnd: int):
    import win32con
    import win32gui
    if win32gui.IsIconic(hwnd):
        win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)

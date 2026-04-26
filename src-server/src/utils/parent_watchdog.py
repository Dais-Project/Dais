import threading
import sys
from typing import Callable

class ParentWatchdog(threading.Thread):
    def __init__(self, callback: Callable[[], None]):
        self._callback = callback
        super().__init__(daemon=True)

    def run(self):
        if sys.stdin.isatty():
            # not running in sidecar mode, skip
            return

        is_parent_alive = True
        try:
            stdin = sys.stdin.buffer
            while is_parent_alive:
                data = stdin.read(1)
                if data == b"":
                    is_parent_alive = False
                    break
        except Exception:
            pass

        if not is_parent_alive:
            self._callback()

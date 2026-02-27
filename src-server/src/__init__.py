import sys

__is_frozen = getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")
IS_DEV = not __is_frozen

import inspect
from typing import Callable


def get_function_definition(func: Callable) -> str:
    sig = inspect.signature(func, eval_str=True)
    prefix = "async def" if inspect.iscoroutinefunction(func) else "def"
    return f"{prefix} {func.__name__}{sig}: ..."

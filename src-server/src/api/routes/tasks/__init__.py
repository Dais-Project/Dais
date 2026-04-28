from .control import task_control_router
from .context_file import context_file_router
from .resource import task_resource_router
from .stream import task_stream_router
from .runtime import task_runtime_router

from .task import task_manage_router
from .schedule import schedule_manage_router

__all__ = [
    "task_control_router",
    "context_file_router",
    "task_resource_router",
    "task_stream_router",
    "task_runtime_router",

    "task_manage_router",
    "schedule_manage_router",
]

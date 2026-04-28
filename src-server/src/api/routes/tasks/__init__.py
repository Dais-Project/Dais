from .manage import task_manage_router
from .control import task_control_router
from .context_file import context_file_router
from .resource import task_resource_router
from .stream import task_stream_router
from .schedule import schedules_router
from .runtime import task_runtime_router

__all__ = [
    "task_manage_router",
    "task_control_router",
    "context_file_router",
    "task_resource_router",
    "task_stream_router",
    "schedules_router",
    "task_runtime_router",
]

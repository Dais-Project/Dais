from .sse import sse_router
from .tasks import (
    context_file_router,
    task_control_router,
    task_manage_router,
    task_resource_router,
    task_stream_router,
    schedules_router,
)
from .workspace import workspaces_router
from .agent import agents_router
from .provider import providers_router
from .llm_model import llm_models_router
from .llm_api import llm_api_router
from .toolset import toolset_router
from .settings import settings_router
from .health import health_router
from .skill import skills_router

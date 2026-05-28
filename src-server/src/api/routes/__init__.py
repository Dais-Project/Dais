# resource routes
from .tasks import *
from .workspace import workspaces_router
from .agent import agents_router
from .provider import providers_router
from .llm_model import llm_models_router
from .llm_api import llm_api_router
from .toolset import toolset_router
from .skill import skills_router
from .settings import settings_router

# functional routes
from .sse import sse_router
from .health import health_router
from .static import static_router

# utility routes
from .filesystem import filesystem_router

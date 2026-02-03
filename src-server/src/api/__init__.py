from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException, RequestValidationError
from .routes import (
    workspaces_router,
    tasks_router,
    providers_router,
    llm_api_router,
    llm_models_router,
    agents_router,
    toolset_router,
)
from .exception_handlers import (
    handle_service_error,
    handle_validation_error,
    handle_http_exception,
    handle_unexpected_exception,
)
from .lifespan import lifespan
from ..services.exceptions import ServiceError

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ServiceError, handle_service_error)
app.add_exception_handler(RequestValidationError, handle_validation_error)
app.add_exception_handler(HTTPException, handle_http_exception)
app.add_exception_handler(Exception, handle_unexpected_exception)

app.include_router(workspaces_router, prefix="/api/workspaces")
app.include_router(agents_router, prefix="/api/agents")
app.include_router(providers_router, prefix="/api/providers")
app.include_router(llm_models_router, prefix="/api/llm_models")
app.include_router(llm_api_router, prefix="/api/llm")
app.include_router(tasks_router, prefix="/api/tasks")
app.include_router(toolset_router, prefix="/api/toolsets")

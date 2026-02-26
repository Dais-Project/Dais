from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.routing import APIRoute
from fastapi_pagination import add_pagination
from .routes import (
    sse_router,
    workspaces_router,
    providers_router,
    llm_api_router,
    llm_models_router,
    agents_router,
    toolset_router,
    settings_router,
    task_manage_router,
    task_stream_router,
    context_file_router,
)
from .exception_handlers import (
    ErrorResponseSchema,
    handle_service_error,
    handle_validation_error,
    handle_http_exception,
    handle_unexpected_exception,
)
from .lifespan import lifespan
from ..services.exceptions import ServiceError

app = FastAPI(
    lifespan=lifespan,
    separate_input_output_schemas=False,
    responses={
        400: {"model": ErrorResponseSchema},
        401: {"model": ErrorResponseSchema},
        403: {"model": ErrorResponseSchema}, 
        404: {"model": ErrorResponseSchema},
        409: {"model": ErrorResponseSchema},
        422: {"model": ErrorResponseSchema},
        500: {"model": ErrorResponseSchema},
    },
)

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

app.include_router(sse_router, prefix="/api/events")
app.include_router(workspaces_router, prefix="/api/workspaces")
app.include_router(agents_router, prefix="/api/agents")
app.include_router(providers_router, prefix="/api/providers")
app.include_router(llm_models_router, prefix="/api/llm_models")
app.include_router(llm_api_router, prefix="/api/llm")
app.include_router(toolset_router, prefix="/api/toolsets")
app.include_router(settings_router, prefix="/api/settings")
app.include_router(task_manage_router, prefix="/api/tasks")
app.include_router(task_stream_router, prefix="/api/tasks")
app.include_router(context_file_router, prefix="/api/tasks")

add_pagination(app)

def use_route_names_as_operation_ids(application: FastAPI) -> None:
    """
    Simplify operation IDs so that generated API clients have simpler function names.
    Should be called only after all routes have been added.
    """
    for route in application.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name
use_route_names_as_operation_ids(app)

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from loguru import logger
from .routes import (
    workspaces_router,
    tasks_router,
    providers_router,
    llm_api_router,
    llm_models_router,
    agents_router,
    toolset_router,
)
from .db import migrate_db
from .agent.tool import use_mcp_toolset_manager

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    migrate_db()
    mcp_toolset_manager = use_mcp_toolset_manager()
    await mcp_toolset_manager.connect_mcp_servers()
    try:
        yield
    finally:
        await mcp_toolset_manager.disconnect_mcp_servers()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

@app.exception_handler(Exception)
async def handle_unexpected_exception(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error")
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": "Internal server error"})

app.include_router(workspaces_router, prefix="/api/workspaces")
app.include_router(agents_router, prefix="/api/agents")
app.include_router(providers_router, prefix="/api/providers")
app.include_router(llm_models_router, prefix="/api/llm_models")
app.include_router(llm_api_router, prefix="/api/llm")
app.include_router(tasks_router, prefix="/api/tasks")
app.include_router(toolset_router, prefix="/api/toolsets")

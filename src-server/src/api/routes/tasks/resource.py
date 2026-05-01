from loguru import logger
from fastapi import APIRouter, status
from starlette.responses import FileResponse
from src.db import DbSessionDep
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks import TaskResourceService
from ...exceptions import ApiError, ApiErrorCode


task_resource_router = APIRouter(tags=["task", "files"])
_logger = logger.bind(name="TaskResourceRoute")

@task_resource_router.get("/{task_type}/{task_id}/resources/{resource_id}")
async def get_task_resource_file(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    resource_id: int,
    db_session: DbSessionDep,
) -> FileResponse:
    task_resource_service = TaskResourceService(db_session, task_type)
    resource_path = await task_resource_service.load_task_resource(task_id, resource_id)
    if resource_path is None:
        raise ApiError(status.HTTP_404_NOT_FOUND, ApiErrorCode.TASK_RESOURCE_NOT_FOUND)
    return FileResponse(resource_path)

from fastapi import APIRouter
from fastapi import status
from starlette.responses import FileResponse

from src.schemas.tasks import runtime as task_runtime_schemas

from ...dependencies import TaskResourceServiceDep
from ...exceptions import ApiError
from ...exceptions import ApiErrorCode


task_resource_router = APIRouter(tags=["task", "files"])


@task_resource_router.get("/{task_type}/{task_id}/resources/{resource_id}")
async def get_task_resource_file(
    service: TaskResourceServiceDep,
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    resource_id: int,
) -> FileResponse:
    resource_path = await service.load_task_resource(task_id, resource_id)
    if resource_path is None:
        raise ApiError(
            status.HTTP_404_NOT_FOUND,
            ApiErrorCode.TASK_RESOURCE_NOT_FOUND,
        )
    return FileResponse(resource_path)

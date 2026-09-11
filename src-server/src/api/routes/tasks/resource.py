from fastapi import APIRouter
from fastapi import status
from starlette.responses import FileResponse

from src.schemas.tasks import resource as task_resource_schemas
from src.services.task_resource_access import TaskResourceAccessPayload
from src.services.tasks.resource import TaskResourceService

from ...dependencies import DbSessionDep
from ...dependencies import TaskResourceAccessServiceDep
from ...exceptions import ApiError
from ...exceptions import ApiErrorCode


task_resource_router = APIRouter(tags=["task", "files"])


@task_resource_router.post(
    "/access-url",
    response_model=task_resource_schemas.TaskResourceAccessUrl,
)
async def create_task_resource_access_url(
    access_service: TaskResourceAccessServiceDep,
    data: task_resource_schemas.TaskResourceAccessUrlCreate,
) -> task_resource_schemas.TaskResourceAccessUrl:
    token = access_service.create_token(
        TaskResourceAccessPayload(
            task_type=data.task_type,
            task_id=data.task_id,
            resource_id=data.resource_id,
        )
    )
    return task_resource_schemas.TaskResourceAccessUrl(
        url=f"/api/task-resources/access/{token}"
    )


@task_resource_router.get("/access/{token}")
async def get_task_resource_by_access_token(
    db_session: DbSessionDep,
    access_service: TaskResourceAccessServiceDep,
    token: str,
) -> FileResponse:
    payload = access_service.verify_token(token)
    resource_service = TaskResourceService.from_db_session(
        db_session,
        payload.task_type,
    )
    resource_path = await resource_service.load_task_resource(
        payload.task_id,
        payload.resource_id,
    )
    if resource_path is None:
        raise ApiError(
            status.HTTP_404_NOT_FOUND,
            ApiErrorCode.TASK_RESOURCE_NOT_FOUND,
        )
    return FileResponse(
        resource_path,
        headers={"Cache-Control": "private, no-store"},
    )

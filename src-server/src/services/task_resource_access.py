import secrets

import jwt
from pydantic import BaseModel, ConfigDict, StrictInt, ValidationError

from src.schemas.tasks import runtime as task_runtime_schemas

from .exceptions import ServiceError, ServiceErrorCode, ServiceStatusCode


class TaskResourceAccessInvalidError(ServiceError):
    def __init__(self):
        super().__init__(
            ServiceStatusCode.UNAUTHENTICATED,
            ServiceErrorCode.TASK_RESOURCE_ACCESS_INVALID,
            "Invalid task resource access credential",
        )


class TaskResourceAccessPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_type: task_runtime_schemas.TaskType
    task_id: StrictInt
    resource_id: StrictInt


class TaskResourceAccessService:
    def __init__(self, signing_key: bytes | None = None):
        self._signing_key = signing_key or secrets.token_bytes(32)

    def create_token(self, payload: TaskResourceAccessPayload) -> str:
        return jwt.encode(
            payload.model_dump(mode="json"),
            self._signing_key,
            algorithm="HS256",
        )

    def verify_token(self, token: str) -> TaskResourceAccessPayload:
        try:
            payload = jwt.decode(
                token,
                self._signing_key,
                algorithms=["HS256"],
            )
            return TaskResourceAccessPayload.model_validate(payload)
        except (jwt.InvalidTokenError, ValidationError):
            raise TaskResourceAccessInvalidError() from None


_task_resource_access_service = TaskResourceAccessService()


def use_task_resource_access_service() -> TaskResourceAccessService:
    return _task_resource_access_service

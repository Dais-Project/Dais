from pydantic import BaseModel

from src.schemas.tasks import runtime as task_runtime_schemas


class TaskResourceAccessUrlCreate(BaseModel):
    task_type: task_runtime_schemas.TaskType
    task_id: int
    resource_id: int


class TaskResourceAccessUrl(BaseModel):
    url: str

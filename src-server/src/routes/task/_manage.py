from flask import Response
from pydantic import BaseModel
from flask_pydantic import validate
from ..types import FlaskResponse, PaginatedResponse
from ...services.task import TaskService
from ...db.schemas import task as task_schemas
from .blueprint import tasks_bp

class TasksQueryModel(BaseModel):
    workspace_id: int
    page: int = 1
    per_page: int = 15

@tasks_bp.route("/", methods=["GET"])
@validate()
def get_tasks(query: TasksQueryModel) -> FlaskResponse[PaginatedResponse[task_schemas.TaskRead]]:
    with TaskService() as service:
        result = service.get_tasks(query.workspace_id, query.page, query.per_page)

        return PaginatedResponse[task_schemas.TaskRead](
            items=[task_schemas.TaskRead.model_validate(task)
                   for task in result["items"]],
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )

# TODO: task brief API

@tasks_bp.route("/<int:task_id>", methods=["GET"])
@validate()
def get_task(task_id: int) -> FlaskResponse[task_schemas.TaskRead]:
    with TaskService() as service:
        task = service.get_task_by_id(task_id)
        return task_schemas.TaskRead.model_validate(task)

@tasks_bp.route("/", methods=["POST"])
@validate()
def new_task(body: task_schemas.TaskCreate) -> FlaskResponse[task_schemas.TaskRead]:
    with TaskService() as service:
        new_task = service.create_task(body)
        return task_schemas.TaskRead.model_validate(new_task), 201

@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
def delete_task(task_id: int) -> FlaskResponse:
    with TaskService() as service:
        service.delete_task(task_id)
    return Response(status=204)

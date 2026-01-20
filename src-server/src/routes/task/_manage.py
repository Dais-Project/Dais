from flask import Response, jsonify
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
def get_tasks(query: TasksQueryModel) -> FlaskResponse:
    with TaskService() as service:
        result = service.get_tasks(query.workspace_id, query.page, query.per_page)

        serialized_items = [
            task_schemas.TaskRead
                        .model_validate(task)
                        .model_dump(mode="json")
            for task in result["items"]
        ]
        return jsonify(PaginatedResponse[dict](
            items=serialized_items,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        ))

# TODO: task brief API

@tasks_bp.route("/<int:task_id>", methods=["GET"])
def get_task(task_id: int) -> FlaskResponse:
    with TaskService() as service:
        task = service.get_task_by_id(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(task_schemas.TaskRead
                                   .model_validate(task)
                                   .model_dump(mode="json"))

@tasks_bp.route("/", methods=["POST"])
@validate()
def new_task(body: task_schemas.TaskCreate) -> FlaskResponse:
    with TaskService() as service:
        new_task = service.create_task(body)
        return jsonify(task_schemas.TaskRead
                                   .model_validate(new_task)
                                   .model_dump(mode="json")), 201

@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
def delete_task(task_id: int) -> FlaskResponse:
    with TaskService() as service:
        service.delete_task(task_id)
    return Response(status=204)

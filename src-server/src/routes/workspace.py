from flask import Blueprint, Response, jsonify
from pydantic import BaseModel
from flask_pydantic import validate
from .types import FlaskResponse, PaginatedResponse
from ..services.workspace import WorkspaceService
from ..db.schemas import workspace as workspace_schemas

workspaces_bp = Blueprint("workspaces", __name__)

class WorkspacesQueryModel(BaseModel):
    page: int = 1
    per_page: int = 10

@workspaces_bp.route("/", methods=["GET"])
@validate()
def get_workspaces(query: WorkspacesQueryModel) -> FlaskResponse:
    with WorkspaceService() as service:
        result = service.get_workspaces(query.page, query.per_page)

        serialized_items = [
            workspace_schemas.WorkspaceRead
                             .model_validate(workspace)
                             .model_dump(mode="json")
            for workspace in result["items"]
        ]
        return jsonify(PaginatedResponse[dict](
            items=serialized_items,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        ))

# TODO: workspace brief API

@workspaces_bp.route("/<int:workspace_id>", methods=["GET"])
def get_workspace(workspace_id: int) -> FlaskResponse:
    with WorkspaceService() as service:
        workspace = service.get_workspace_by_id(workspace_id)
        if not workspace:
            return jsonify({"error": "Workspace not found"}), 404

        return jsonify(workspace_schemas.WorkspaceRead
                                       .model_validate(workspace)
                                       .model_dump(mode="json"))

@workspaces_bp.route("/", methods=["POST"])
@validate()
def create_workspace(body: workspace_schemas.WorkspaceCreate) -> FlaskResponse:
    with WorkspaceService() as service:
        new_workspace = service.create_workspace(body)
        return jsonify(workspace_schemas.WorkspaceRead
                                       .model_validate(new_workspace)
                                       .model_dump(mode="json")), 201

@workspaces_bp.route("/<int:workspace_id>", methods=["PUT"])
@validate()
def update_workspace(workspace_id: int, body: workspace_schemas.WorkspaceUpdate) -> FlaskResponse:
    with WorkspaceService() as service:
        updated_workspace = service.update_workspace(workspace_id, body)
        return jsonify(workspace_schemas.WorkspaceRead
                                        .model_validate(updated_workspace)
                                        .model_dump(mode="json"))

@workspaces_bp.route("/<int:workspace_id>", methods=["DELETE"])
def delete_workspace(workspace_id: int) -> FlaskResponse:
    with WorkspaceService() as service:
        service.delete_workspace(workspace_id)
        return Response(status=204)

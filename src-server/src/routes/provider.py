from flask import Blueprint, Response, jsonify
from flask_pydantic import validate
from .types import FlaskResponse
from ..services.provider import ProviderService
from ..db.schemas import provider as provider_schemas

providers_bp = Blueprint("providers", __name__)

@providers_bp.route("/", methods=["GET"])
def get_providers() -> FlaskResponse:
    with ProviderService() as service:
        providers = service.get_providers()
        return jsonify([provider_schemas.ProviderRead
                                        .model_validate(provider)
                                        .model_dump(mode="json")
                        for provider in providers])

# TODO: provider brief API

@providers_bp.route("/<int:provider_id>", methods=["GET"])
def get_provider(provider_id: int) -> FlaskResponse:
    with ProviderService() as service:
        provider = service.get_provider_by_id(provider_id)
        if not provider:
            from ..services.provider import ProviderNotFoundError
            raise ProviderNotFoundError(f"Provider {provider_id} not found")
        return jsonify(provider_schemas.ProviderRead
                                       .model_validate(provider)
                                       .model_dump(mode="json"))

@providers_bp.route("/", methods=["POST"])
@validate()
def create_provider(body: provider_schemas.ProviderCreate) -> FlaskResponse:
    with ProviderService() as service:
        new_provider = service.create_provider(body)
        return jsonify(provider_schemas.ProviderRead
                                       .model_validate(new_provider)
                                       .model_dump(mode="json")), 201

@providers_bp.route("/<int:provider_id>", methods=["PUT"])
@validate()
def update_provider(provider_id: int, body: provider_schemas.ProviderUpdate) -> FlaskResponse:
    with ProviderService() as service:
        updated_provider = service.update_provider(provider_id, body)
        return jsonify(provider_schemas.ProviderRead
                                       .model_validate(updated_provider)
                                       .model_dump(mode="json"))

@providers_bp.route("/<int:provider_id>", methods=["DELETE"])
def delete_provider(provider_id: int) -> FlaskResponse:
    with ProviderService() as service:
        service.delete_provider(provider_id)
        return Response(status=204)

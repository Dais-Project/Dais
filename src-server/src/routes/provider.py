from flask import Blueprint, Response
from flask_pydantic import validate
from .types import FlaskResponse
from ..services.provider import ProviderService
from ..db.schemas import provider as provider_schemas

providers_bp = Blueprint("providers", __name__)

@providers_bp.route("/", methods=["GET"])
@validate(response_many=True)
def get_providers() -> FlaskResponse[list[provider_schemas.ProviderRead]]:
    with ProviderService() as service:
        providers = service.get_providers()
        return [provider_schemas.ProviderRead.model_validate(provider)
                for provider in providers]

# TODO: provider brief API

@providers_bp.route("/<int:provider_id>", methods=["GET"])
@validate()
def get_provider(provider_id: int) -> FlaskResponse[provider_schemas.ProviderRead]:
    with ProviderService() as service:
        provider = service.get_provider_by_id(provider_id)
        return provider_schemas.ProviderRead.model_validate(provider)

@providers_bp.route("/", methods=["POST"])
@validate()
def create_provider(body: provider_schemas.ProviderCreate) -> FlaskResponse[provider_schemas.ProviderRead]:
    with ProviderService() as service:
        new_provider = service.create_provider(body)
        return provider_schemas.ProviderRead.model_validate(new_provider), 201

@providers_bp.route("/<int:provider_id>", methods=["PUT"])
@validate()
def update_provider(provider_id: int, body: provider_schemas.ProviderUpdate) -> FlaskResponse[provider_schemas.ProviderRead]:
    with ProviderService() as service:
        updated_provider = service.update_provider(provider_id, body)
        return provider_schemas.ProviderRead.model_validate(updated_provider)

@providers_bp.route("/<int:provider_id>", methods=["DELETE"])
def delete_provider(provider_id: int) -> FlaskResponse:
    with ProviderService() as service:
        service.delete_provider(provider_id)
        return Response(status=204)

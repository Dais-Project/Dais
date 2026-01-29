from flask import Blueprint, jsonify
from pydantic import BaseModel
from flask_pydantic import validate
from dais_sdk import LLM, LlmProviders
from .types import FlaskResponse

llm_api_bp = Blueprint("llm_api", __name__)

class FetchModelsBody(BaseModel):
    base_url: str
    api_key: str
    type: str

@llm_api_bp.route("/models", methods=["POST"])
@validate()
def fetch_models(body: FetchModelsBody) -> FlaskResponse:
    try:
        provider_type = LlmProviders(body.type)
    except ValueError:
        return jsonify({"error": "Invalid provider type"}), 400

    llm = LLM(
        provider=provider_type,
        base_url=body.base_url,
        api_key=body.api_key)
    return jsonify(llm.list_models())

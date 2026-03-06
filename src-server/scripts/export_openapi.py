import json
from pathlib import Path
from typing import Any
from openapi_pydantic import DataType, OpenAPI, Components, Schema, Response
from pydantic import TypeAdapter
from src.main import app
from src.schemas.extra import EXTRA_SCHEMA_TYPES

def _replace_defs_refs(obj: Any) -> Any:
    """Recursively replace #/$defs/ references with #/components/schemas/"""
    if isinstance(obj, dict):
        return {
            k: _replace_defs_refs(v) for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_replace_defs_refs(item) for item in obj]
    if isinstance(obj, str):
        return obj.replace("#/$defs/", "#/components/schemas/")
    return obj

def custom_openapi() -> dict[str, Any]:
    raw = app.openapi()
    openapi = OpenAPI.model_validate(raw)

    if openapi.components is None:
        openapi.components = Components()
    if openapi.components.schemas is None:
        openapi.components.schemas = {}

    for model in EXTRA_SCHEMA_TYPES:
        if (isinstance(model, dict) and
            "name" in model and
            "description" in model and
            "parameters" in model):
            openapi.components.schemas[model["name"]] = Schema(
                type=DataType.OBJECT,
                properties=model["parameters"]["properties"],
                required=model["parameters"]["required"],
            )
            continue

        schema_dict = TypeAdapter(model).json_schema()
        defs = schema_dict.pop("$defs", {})
        schema_dict = _replace_defs_refs(schema_dict)

        openapi.components.schemas[model.__name__] = Schema(**schema_dict)
        for name, definition in defs.items():
            definition = _replace_defs_refs(definition)
            openapi.components.schemas[name] = Schema(**definition)

    # clear itemSchema for sse endpoints
    # TODO: remove this after orval supports `itemSchema` in openapi
    if openapi.paths is None:
        openapi.paths = {}
    for path_item in openapi.paths.values():
        if path_item.post is not None and path_item.post.responses is not None:
            for response in path_item.post.responses.values():
                if isinstance(response, Response) and response.content is not None:
                    for media_type in response.content.values():
                        if hasattr(media_type, "itemSchema"):
                            delattr(media_type, "itemSchema")

    return openapi.model_dump(by_alias=True, exclude_unset=True, exclude_none=True)

def export_openapi_schema(schema_dict: dict[str, Any]):
    # root of the whole project
    output_path = Path(__file__).parent.parent.parent / "openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema_dict, f, indent=2, ensure_ascii=False)
    print(f"OpenAPI schema exported to {output_path}")

def main():
    print("Exporting OpenAPI schema...")
    schema = custom_openapi()
    export_openapi_schema(schema)

if __name__ == "__main__":
    main()

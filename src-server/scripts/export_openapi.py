import json
from pathlib import Path
from typing import Any
from openapi_pydantic import OpenAPI, Components, Schema
from pydantic import TypeAdapter
from src.main import app
from src.db.schemas.extra import EXTRA_SCHEMA_TYPES

def custom_openapi() -> dict[str, Any]:
    raw = app.openapi()
    openapi = OpenAPI.model_validate(raw)

    if openapi.components is None:
        openapi.components = Components()
    if openapi.components.schemas is None:
        openapi.components.schemas = {}

    for model in EXTRA_SCHEMA_TYPES:
        schema_dict = TypeAdapter(model).json_schema()
        defs = schema_dict.pop("$defs", {})
        openapi.components.schemas[model.__name__] = Schema(**schema_dict)
        for name, definition in defs.items():
            openapi.components.schemas[name] = Schema(**definition)

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

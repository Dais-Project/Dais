import json
from pathlib import Path
from src.main import app

def export_openapi_schema():
    schema = app.openapi()
    # root of the whole project
    output_path = Path(__file__).parent.parent.parent / "openapi.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    print(f"OpenAPI schema exported to {output_path}")

if __name__ == "__main__":
    export_openapi_schema()

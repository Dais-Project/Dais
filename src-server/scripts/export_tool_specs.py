import asyncio
import json
from src.agent.tool.builtin_tools import get_builtin_tool_arg_schemas


async def main():
    schemas = get_builtin_tool_arg_schemas()
    with open("tool_schema.json", "w") as f:
        json.dump(schemas, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    asyncio.run(main())

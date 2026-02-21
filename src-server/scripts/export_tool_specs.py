import asyncio
import json
from dais_sdk.tool.prepare import prepare_tools
from src.agent.tool.toolset_manager.builtin_toolset_manager import BuiltinToolsetManager
from src.agent.tool.toolset_wrapper.built_in_toolset import BuiltInToolsetContext
from src.agent.types import ContextUsage

async def main():
    built_in_toolset_manager = BuiltinToolsetManager("~", ContextUsage.default())
    await built_in_toolset_manager.initialize()
    schemas = []
    for toolset in built_in_toolset_manager.toolsets:
        schemas.extend(prepare_tools(toolset.get_tools()))
    with open("tool_schema.json", "w") as f:
        json.dump(schemas, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    asyncio.run(main())

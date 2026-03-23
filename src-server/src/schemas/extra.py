from typing import TypeAliasType
from dais_sdk.types import ToolSchema
from src.agent.tool import get_builtin_tool_enum, get_builtin_tool_arg_schemas
from src.agent.types.metadata import ToolMessageMetadata

EXTRA_SCHEMA_TYPES: list[type | TypeAliasType | ToolSchema] = [
    ToolMessageMetadata,
    get_builtin_tool_enum(),
    *get_builtin_tool_arg_schemas(),
]

from typing import TypeAliasType
from dais_sdk.types import ToolSchema
from src.agent.tool import get_builtin_tool_enum, get_builtin_tool_arg_schemas
from src.agent.types.metadata import ToolMessageMetadata, TaskResourceMetadata

EXTRA_SCHEMA_TYPES: list[type | TypeAliasType | ToolSchema] = [
    ToolMessageMetadata,
    TaskResourceMetadata,
    get_builtin_tool_enum(),
    *get_builtin_tool_arg_schemas(),
]

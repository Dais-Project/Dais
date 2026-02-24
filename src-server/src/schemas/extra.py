from typing import TypeAliasType
from dais_sdk import ToolSchema
from ..settings import AppSettings
from ..agent.tool import get_builtin_tool_enum, get_builtin_tool_arg_schemas
from ..api.sse_dispatcher.types import DispatcherEvent, DispatcherEventData

EXTRA_SCHEMA_TYPES: list[type | TypeAliasType | ToolSchema] = [
    AppSettings,
    DispatcherEvent,
    DispatcherEventData,
    get_builtin_tool_enum(),
    *get_builtin_tool_arg_schemas(),
]

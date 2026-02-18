from typing import TypeAliasType
from ...agent.tool import get_builtin_tool_enum
from ...agent.tool.builtin_tools.execution_control import TodoItem

EXTRA_SCHEMA_TYPES: list[type | TypeAliasType] = [
    get_builtin_tool_enum(),
    TodoItem,
]

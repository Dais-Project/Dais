from typing import TypeGuard, TypedDict

class ToolMetadata(TypedDict):
    auto_approve: bool

def is_tool_metadata(_: dict) -> TypeGuard[ToolMetadata]:
    return True

from typing import TypeGuard, TypedDict

class ToolMetadata(TypedDict):
    id: int
    auto_approve: bool
    needs_user_interaction: bool

def is_tool_metadata(_: dict) -> TypeGuard[ToolMetadata]:
    return True

from enum import Enum
from typing import TypeGuard, TypedDict

class UserApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class ToolMessageMetadata(TypedDict, total=False):
    user_approval: UserApprovalStatus
    risk_level: int
    risk_reason: str

@staticmethod
def is_agent_tool_metadata(_: dict) -> TypeGuard[ToolMessageMetadata]:
    return True

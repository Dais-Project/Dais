from enum import StrEnum
from typing import Literal, Mapping, TypeGuard, TypedDict

class UserApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class ToolMessageMetadata(TypedDict, total=False):
    user_approval: UserApprovalStatus
    pending_action: Literal["respond", "approve"] # this field is used to identify if a pending tool message needs respond or approve

    risk_level: int
    risk_reason: str
    subtask_id: int # this field is only used for `subtask` tool message

def is_agent_tool_metadata(_: dict) -> TypeGuard[ToolMessageMetadata]:
    return True

class TaskResourceMetadata(TypedDict):
    resource_id: int
    filename: str
    mimetype: str

@staticmethod
def is_task_resource_metadata(_: Mapping) -> TypeGuard[TaskResourceMetadata]:
    return True

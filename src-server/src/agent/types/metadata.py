from enum import StrEnum
from typing import Literal, Mapping, TypeGuard, TypedDict

class UserApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class ToolMessageMetadata(TypedDict, total=False):
    user_approval: UserApprovalStatus

    risk_level: int
    risk_reason: str

    # this field is used to identify if a pending tool message needs respond or approve
    pending_action: Literal["respond", "approve"]

def is_agent_tool_metadata(_: dict) -> TypeGuard[ToolMessageMetadata]:
    return True

class TextResourceMetadata(TypedDict):
    resource_id: str
    text: str

class UrlResourceMetadata(TypedDict):
    resource_id: str
    url: str
    type: Literal["image", "audio", "video", "document"]

class FileResourceMetadata(TypedDict):
    resource_id: int
    filename: str
    mimetype: str

type TaskResourceMetadata = TextResourceMetadata | UrlResourceMetadata | FileResourceMetadata

@staticmethod
def is_task_resource_metadata(_: Mapping) -> TypeGuard[TaskResourceMetadata]:
    return True

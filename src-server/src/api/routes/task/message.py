"""
Customized message types for HTTP response.
"""

from abc import abstractmethod
from enum import Enum
from typing import Literal, TypedDict, Self
from dais_sdk.types.message import (
    ChatMessage as SdkMessage,
    UserMessage as SdkUserMessage,
    AssistantMessage as SdkAssistantMessage,
    SystemMessage as SdkSystemMessage,
    ToolMessage as SdkToolMessage,
    OpenAIMessageContent,
    ChatCompletionAssistantToolCall,
    ChatCompletionAudioResponse,
    ChatCompletionImageURL, 
    LiteLlmUsage
)
from ....schemas import DTOBase
from ....db.models.task import TaskType, TaskUsage

class BaseMessage(DTOBase):
    id: str

    @property
    @abstractmethod
    def _origin_type(self) -> type[SdkMessage]: ...

    def to_sdk_message(self) -> SdkMessage:
        return self._origin_type.model_validate(self, from_attributes=True)

    @classmethod
    def from_sdk_message(cls, src: SdkMessage) -> Self:
        return cls.model_validate(src, from_attributes=True)

class UserMessage(BaseMessage):
    role: Literal["user"]
    content: OpenAIMessageContent
    @property
    def _origin_type(self) -> type[SdkMessage]:
        return SdkUserMessage

class AssistantMessage(BaseMessage):
    role: Literal["assistant"]
    content: str | None 
    reasoning_content: str | None
    tool_calls: list[ChatCompletionAssistantToolCall] | None
    audio: ChatCompletionAudioResponse | None
    images: list[ChatCompletionImageURL] | None
    usage: LiteLlmUsage | None
    @property
    def _origin_type(self) -> type[SdkMessage]:
        return SdkAssistantMessage

class SystemMessage(BaseMessage):
    content: str
    role: Literal["system"]
    @property
    def _origin_type(self) -> type[SdkMessage]:
        return SdkSystemMessage

class ToolMessage(BaseMessage):
    class UserApprovalStatus(str, Enum):
        PENDING = "pending"
        APPROVED = "approved"
        DENIED = "denied"

    class ToolMessageMetadata(TypedDict, total=False):
        user_approval: ToolMessage.UserApprovalStatus

    role: Literal["tool"]
    tool_call_id: str
    name: str
    arguments: str
    result: str | None
    error: str | None
    metadata: ToolMessageMetadata

    @property
    def _origin_type(self) -> type[SdkMessage]:
        return SdkToolMessage

TaskMessage = UserMessage | AssistantMessage | SystemMessage | ToolMessage

class TaskBase(DTOBase):
    title: str
    type: TaskType
    workspace_id: int

class TaskBrief(TaskBase):
    id: int
    usage: TaskUsage
    last_run_at: int
    agent_id: int | None

class TaskRead(TaskBase):
    id: int
    messages: list[TaskMessage]
    usage: TaskUsage
    last_run_at: int
    agent_id: int | None

class TaskCreate(TaskBase):
    messages: list[TaskMessage]
    agent_id: int

from . import DTOBase
from .provider import LlmModelRead
from .toolset import ToolRead

class AgentBase(DTOBase):
    name: str
    icon_name: str

class AgentBrief(AgentBase):
    id: int
    model: LlmModelRead | None

class AgentRead(AgentBase):
    id: int
    model: LlmModelRead | None
    instruction: str
    usable_tools: list[ToolRead]

class AgentCreate(AgentBase):
    model_id: int | None
    instruction: str
    usable_tool_ids: list[int]

class AgentUpdate(DTOBase):
    name: str | None
    icon_name: str | None
    instruction: str | None
    model_id: int | None
    usable_tool_ids: list[int] | None

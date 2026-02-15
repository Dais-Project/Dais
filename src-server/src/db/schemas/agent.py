from . import DTOBase
from .provider import LlmModelRead

class AgentBase(DTOBase):
    name: str
    icon_name: str

class AgentBrief(AgentBase):
    id: int

class AgentRead(AgentBase):
    id: int
    model: LlmModelRead | None
    system_prompt: str

class AgentCreate(AgentBase):
    model_id: int | None
    system_prompt: str

class AgentUpdate(DTOBase):
    name: str | None
    icon_name: str | None
    system_prompt: str | None
    model_id: int | None

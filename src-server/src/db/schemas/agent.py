from . import DTOBase
from .provider import LlmModelRead

class AgentBase(DTOBase):
    name: str
    icon_name: str
    system_prompt: str

class AgentBrief(DTOBase):
    id: int
    name: str
    icon_name: str

class AgentRead(AgentBase):
    id: int
    model: LlmModelRead | None

class AgentCreate(AgentBase):
    model_id: int | None

class AgentUpdate(DTOBase):
    name: str | None
    icon_name: str | None
    system_prompt: str | None
    model_id: int | None

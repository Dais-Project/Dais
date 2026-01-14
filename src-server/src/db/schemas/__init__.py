from pydantic import BaseModel, ConfigDict

class DTOBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

from .workspace import WorkspaceRead
from .agent import AgentRead
from .toolset import ToolsetRead, ToolRead

WorkspaceRead.model_rebuild()
AgentRead.model_rebuild()
ToolsetRead.model_rebuild()
ToolRead.model_rebuild()

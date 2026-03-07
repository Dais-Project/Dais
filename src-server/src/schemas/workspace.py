from . import DTOBase
from .agent import AgentBrief
from .toolset import ToolRead

class WorkspaceBase(DTOBase):
    name: str
    directory: str

class WorkspaceBrief(WorkspaceBase):
    id: int

class WorkspaceRead(WorkspaceBase):
    id: int
    instruction: str
    usable_agents: list[AgentBrief]
    usable_tools: list[ToolRead]

class WorkspaceCreate(WorkspaceBase):
    instruction: str
    usable_agent_ids: list[int]
    usable_tool_ids: list[int]

class WorkspaceUpdate(DTOBase):
    name: str | None
    directory: str | None
    instruction: str | None
    usable_agent_ids: list[int] | None
    usable_tool_ids: list[int] | None

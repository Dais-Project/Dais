from . import DTOBase
from .agent import AgentRead
from .toolset import ToolRead

class WorkspaceBase(DTOBase):
    name: str
    directory: str

class WorkspaceBrief(WorkspaceBase):
    id: int

class WorkspaceRead(WorkspaceBase):
    id: int
    workspace_background: str
    usable_agents: list[AgentRead]
    usable_tools: list[ToolRead]

class WorkspaceCreate(WorkspaceBase):
    workspace_background: str
    usable_agent_ids: list[int]
    usable_tool_ids: list[int]

class WorkspaceUpdate(DTOBase):
    name: str | None
    directory: str | None
    workspace_background: str | None
    usable_agent_ids: list[int] | None
    usable_tool_ids: list[int] | None

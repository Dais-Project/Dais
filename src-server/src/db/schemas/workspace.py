from typing import TYPE_CHECKING
from . import DTOBase

if TYPE_CHECKING:
    from .agent import AgentRead

class WorkspaceBase(DTOBase):
    name: str
    directory: str

class WorkspaceBrief(WorkspaceBase):
    id: int

class WorkspaceRead(WorkspaceBase):
    id: int
    workspace_background: str
    usable_agents: list[AgentRead]

class WorkspaceCreate(WorkspaceBase):
    workspace_background: str
    usable_agent_ids: list[int]

class WorkspaceUpdate(DTOBase):
    name: str | None
    directory: str | None
    workspace_background: str | None
    usable_agent_ids: list[int] | None

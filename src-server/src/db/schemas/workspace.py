from typing import TYPE_CHECKING
from . import DTOBase

if TYPE_CHECKING:
    from .agent import AgentRead

class WorkspaceBase(DTOBase):
    name: str
    directory: str
    workspace_background: str

class WorkspaceRead(WorkspaceBase):
    id: int
    usable_agents: list[AgentRead]

class WorkspaceCreate(WorkspaceBase):
    usable_agent_ids: list[int]

class WorkspaceUpdate(DTOBase):
    name: str | None
    directory: str | None
    workspace_background: str | None
    usable_agent_ids: list[int] | None

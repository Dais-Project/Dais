from . import DTOBase
from .agent import AgentBrief
from .toolset import ToolRead
from .skill import SkillBrief


class WorkspaceNoteBase(DTOBase):
    relative: str
    content: str

class WorkspaceNoteRead(WorkspaceNoteBase):
    id: int

class WorkspaceBase(DTOBase):
    name: str
    directory: str

class WorkspaceBrief(WorkspaceBase):
    id: int

class WorkspaceRead(WorkspaceBase):
    id: int
    instruction: str
    notes: list[WorkspaceNoteRead]
    usable_agents: list[AgentBrief]
    usable_tools: list[ToolRead]
    usable_skills: list[SkillBrief]

class WorkspaceCreate(WorkspaceBase):
    instruction: str
    notes: list[WorkspaceNoteBase]
    usable_agent_ids: list[int]
    usable_tool_ids: list[int]
    usable_skill_ids: list[int]

class WorkspaceUpdate(DTOBase):
    name: str | None
    directory: str | None
    instruction: str | None
    notes: list[WorkspaceNoteBase] | None
    usable_agent_ids: list[int] | None
    usable_tool_ids: list[int] | None
    usable_skill_ids: list[int] | None = None

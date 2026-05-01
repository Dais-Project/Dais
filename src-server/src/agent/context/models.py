from dataclasses import dataclass
from typing import Protocol
from dais_sdk.types import Message
from src.agent.notes import NoteManager
from src.db.models import tasks as task_models
from src.schemas import (
    agent as agent_schemas,
    provider as provider_schemas,
    skill as skill_schemas,
    workspace as workspace_schemas,
)
from src.schemas.tasks import runtime as task_runtime_schemas
from src.agent.types import ContextUsage


@dataclass(frozen=True)
class ToolRuntimeContext:
    usage: ContextUsage
    note_manager: NoteManager

@dataclass(frozen=True)
class AgentContextResource:
    workspace: workspace_schemas.WorkspaceRead
    agent: agent_schemas.AgentRead
    provider: provider_schemas.ProviderRead
    model: provider_schemas.LlmModelRead
    skills: list[skill_schemas.SkillBrief]

class AgentContextPersistence(Protocol):
    async def persist(self,
                      runtime_id: int,
                      messages: list[Message],
                      usage: task_models.TaskUsage
                      ) -> task_runtime_schemas.TaskRuntimeContext: ...


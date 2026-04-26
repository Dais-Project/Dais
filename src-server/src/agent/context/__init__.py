from .aliases import BuiltInToolAliases
from .models import ToolRuntimeContext, AgentContextResource, AgentContextPersistence

__all__ = [
    "AgentContext",
    "ToolRuntimeContext",
]

import platform
import time
import xml.etree.ElementTree as ET
from collections import namedtuple
from dataclasses import asdict
from typing import Self
from loguru import logger
from dais_sdk.tool import Toolset
from dais_sdk.types import Message, ToolDef
from src.agent.notes import NoteManager
from src.db import db_context
from src.db.models import tasks as task_models
from src.schemas import (
    agent as agent_schemas,
    workspace as workspace_schemas,
    provider as provider_schemas,
    skill as skill_schemas,
)
from src.schemas.tasks import (
    task as task_schemas,
    runtime as task_runtime_schemas,
)
from src.services.agent import AgentService
from src.services.workspace import WorkspaceService
from src.services.llm_model import LlmModelService
from src.services.provider import ProviderService
from src.services.tasks import TaskService
from src.settings import use_app_setting_manager
from ..tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager, BuiltInToolset
from ..prompts import (
    BASE_INSTRUCTION,
    FAILED_TO_LOAD_NOTES_INDEX,
    NO_AVAILABLE_SKILLS,
    NO_WORKSPACE_INSTRUCTION,
    NO_AGENT_INSTRUCTION,
)
from ..types import ContextUsage


class AgentContext:
    _logger = logger.bind(name="AgentContext")

    def __init__(self,
                 task_id: int,
                 task_type: task_runtime_schemas.TaskType,
                 *,
                 messages: list[Message],
                 resource: AgentContextResource,
                 tool_context: ToolRuntimeContext,
                 builtin_toolset_manager: BuiltinToolsetManager,
                 mcp_toolset_manager: McpToolsetManager):
        self.task_id = task_id
        self.task_type = task_type
        self._resource = resource
        self._messages = messages

        self._tool_context = tool_context
        self._builtin_toolset_manager = builtin_toolset_manager
        self._mcp_toolset_manager = mcp_toolset_manager
        self._builtin_tool_aliases = BuiltInToolAliases(builtin_toolset_manager)

    @classmethod
    async def create(cls, task: task_runtime_schemas.TaskRuntimeContext) -> Self:
        assert task.agent_id is not None

        async with db_context() as db_session:
            agent = await AgentService(db_session).get_agent_by_id(task.agent_id)
            workspace = await WorkspaceService(db_session).get_workspace_by_id(task.workspace_id)
            skills = workspace.usable_skills

            assert agent.model_id is not None
            model = await LlmModelService(db_session).get_model_by_id(agent.model_id)
            provider = await ProviderService(db_session).get_provider_by_id(model.provider_id)

        usage = task.usage
        usage.max_tokens = model.context_size
        usage = ContextUsage(**asdict(usage))
        messages = task.messages

        note_manager = NoteManager(task.workspace_id)
        await note_manager.materialize()
        await note_manager.start_watching()

        tool_context = ToolRuntimeContext(usage=usage, note_manager=note_manager)
        builtin_toolset_manager = await BuiltinToolsetManager.create(workspace.id, workspace.directory, tool_context)
        mcp_toolset_manager = use_mcp_toolset_manager()
        return cls(task.id,
                   task.type,
                   messages=messages,
                   resource=AgentContextResource(
                       workspace=workspace_schemas.WorkspaceRead.model_validate(workspace),
                       agent=agent_schemas.AgentRead.model_validate(agent),
                       provider=provider_schemas.ProviderRead.model_validate(provider),
                       model=provider_schemas.LlmModelRead.model_validate(model),
                       skills=[skill_schemas.SkillBrief.model_validate(skill) for skill in skills],
                   ),
                   tool_context=tool_context,
                   builtin_toolset_manager=builtin_toolset_manager,
                   mcp_toolset_manager=mcp_toolset_manager)

    @staticmethod
    def _format_skills(skills: list[skill_schemas.SkillBrief]) -> str:
        if len(skills) == 0:
            return NO_AVAILABLE_SKILLS
        root = ET.Element("available_skills")
        for skill in skills:
            skill_elem = ET.SubElement(root, "skill")
            ET.SubElement(skill_elem, "id").text = str(skill.id)
            ET.SubElement(skill_elem, "name").text = skill.name
            ET.SubElement(skill_elem, "description").text = skill.description
        return ET.tostring(root, encoding="unicode")

    ResolvedInstructions = namedtuple("ResolvedInstructions", ["base", "workspace", "agent"])
    def _resolve_instructions(self) -> ResolvedInstructions:
        workspace_instruction = self._resource.workspace.instruction or NO_WORKSPACE_INSTRUCTION
        agent_instruction = self._resource.agent.instruction or NO_AGENT_INSTRUCTION

        builtin_tool_aliases = self._builtin_tool_aliases
        resolved_base_instruction = builtin_tool_aliases.substitute(BASE_INSTRUCTION)
        resolved_workspace_instruction = builtin_tool_aliases.substitute(workspace_instruction)
        resolved_agent_instruction = builtin_tool_aliases.substitute(agent_instruction)
        return AgentContext.ResolvedInstructions(resolved_base_instruction, resolved_workspace_instruction, resolved_agent_instruction)

    @property
    def usage(self) -> ContextUsage:
        return self._tool_context.usage

    @property
    def toolsets(self) -> list[Toolset]:
        return [*self._builtin_toolset_manager.toolsets,
                *self._mcp_toolset_manager.toolsets]

    @property
    def provider(self) -> provider_schemas.ProviderRead:
        return self._resource.provider

    @property
    def model(self) -> provider_schemas.LlmModelRead:
        return self._resource.model

    @property
    def messages(self) -> list[Message]: return self._messages
    @messages.setter
    def messages(self, new_messages: list[Message]): self._messages = new_messages

    @property
    def usable_tool_ids(self) -> set[int] | None:
        workspace_usable_tool_ids = {tool.id for tool in self._resource.workspace.usable_tools}
        agent_usable_tool_ids = {tool.id for tool in self._resource.agent.usable_tools}

        if len(workspace_usable_tool_ids) == 0 and len(agent_usable_tool_ids) == 0:
            # both workspace and agent have no usable tools configured, return None meaning no need to filter
            return None

        if len(workspace_usable_tool_ids) == 0:
            return agent_usable_tool_ids
        if len(agent_usable_tool_ids) == 0:
            return workspace_usable_tool_ids
        return workspace_usable_tool_ids & agent_usable_tool_ids

    async def compose_system_instruction(self) -> str:
        settings = use_app_setting_manager().settings
        available_skills = AgentContext._format_skills(self._resource.skills)
        resolved_instructions = self._resolve_instructions()
        notes_index = await self._tool_context.note_manager.get_notes_index()
        resolved_notes_index = notes_index if notes_index is not None else FAILED_TO_LOAD_NOTES_INDEX

        return resolved_instructions.base.format(
            os_platform=platform.system(),
            user_language=settings.reply_language,
            available_skills=available_skills,
            workspace_notes_index=resolved_notes_index,
            workspace_name=self._resource.workspace.name,
            workspace_directory=self._resource.workspace.directory,
            workspace_instruction=resolved_instructions.workspace,
            agent_role=self._resource.agent.name,
            agent_instruction=resolved_instructions.agent,
        ).strip()

    def find_tool(self, tool_name: str) -> ToolDef | None:
        for toolset in self.toolsets:
            for tool in toolset.get_tools():
                if tool.name == tool_name:
                    return tool
        return None

    async def persist(self) -> task_models.Task:
        try:
            await self._tool_context.note_manager.stop_watching()
            await self._tool_context.note_manager.clear_materialized()
        except:
            self._logger.exception("Failed to execute NoteManager cleanup.")

        async with db_context() as db_session:
            return await TaskService(db_session).update_task(self.task_id, task_schemas.TaskUpdate(
                title=None, agent_id=None,
                messages=self._messages,
                usage=self._tool_context.usage,
                last_run_at=int(time.time())
            ))

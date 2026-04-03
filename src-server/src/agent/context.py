import platform
import re
import time
import xml.etree.ElementTree as ET
from collections import namedtuple
from dataclasses import asdict
from typing import Self, cast
from dais_sdk.tool import Toolset
from dais_sdk.types import Message, ToolDef
from src.db import db_context
from src.db.models import task as task_models
from src.schemas import (
    agent as agent_schemas,
    workspace as workspace_schemas,
    provider as provider_schemas,
    skill as skill_schemas,
    task as task_schemas,
)
from src.services import (
    AgentService,
    WorkspaceService,
    LlmModelService,
    ProviderService,
    TaskService,
)
from src.settings import use_app_setting_manager
from .tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager, BuiltInToolset
from .prompts import BASE_INSTRUCTION, NO_AVAILABLE_SKILLS, NO_WORKSPACE_INSTRUCTION, NO_AGENT_INSTRUCTION
from .types import ContextUsage

class BuiltInToolAliases:
    def __init__(self, builtin_toolset_manager: BuiltinToolsetManager):
        self._toolset_manager = builtin_toolset_manager
        self._map = self._init_map()

    def _init_map(self) -> dict[str, str]:
        result = {}
        for toolset in self._toolset_manager.toolsets:
            toolset = cast(BuiltInToolset, toolset)
            namespaced_tool_names = [tool.name for tool in toolset.get_tools(namespaced_tool_name=True)]
            non_namespaced_tool_names = [tool.name for tool in toolset.get_tools(namespaced_tool_name=False)]
            for namespaced_tool_name, non_namespaced_tool_name in zip(namespaced_tool_names, non_namespaced_tool_names):
                result[non_namespaced_tool_name] = namespaced_tool_name
        return result

    @property
    def map(self) -> dict[str, str]:
        return self._map

    def substitute(self, text: str) -> str:
        aliases = self._map
        def replacer(match: re.Match[str]):
            key = match.group(1)
            return aliases.get(key, match.group(0))
        return re.sub(r'\$\{(\w+)\}', replacer, text)


class AgentContext:
    def __init__(self,
                 task_id: int,
                 *,
                 usage: task_models.TaskUsage,
                 messages: list[Message],
                 workspace: workspace_schemas.WorkspaceRead,
                 agent: agent_schemas.AgentRead,
                 provider: provider_schemas.ProviderRead,
                 model: provider_schemas.LlmModelRead,
                 skills: list[skill_schemas.SkillBrief],
                 builtin_toolset_manager: BuiltinToolsetManager,
                 mcp_toolset_manager: McpToolsetManager):
        self.task_id = task_id
        self._workspace = workspace
        self._agent = agent
        self._skills = skills
        self._provider = provider
        self._model = model

        self._messages = messages
        self._usage = ContextUsage(**asdict(usage))

        self._builtin_toolset_manager = builtin_toolset_manager
        self._mcp_toolset_manager = mcp_toolset_manager
        self._builtin_tool_aliases = BuiltInToolAliases(builtin_toolset_manager)

    @classmethod
    async def create(cls, task: task_schemas.TaskRead) -> Self:
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
        messages = task.messages

        builtin_toolset_manager = BuiltinToolsetManager(workspace.id, workspace.directory, ContextUsage.default())
        await builtin_toolset_manager.initialize()
        mcp_toolset_manager = use_mcp_toolset_manager()
        return cls(task.id,
                   usage=usage,
                   messages=messages,
                   workspace=workspace_schemas.WorkspaceRead.model_validate(workspace),
                   agent=agent_schemas.AgentRead.model_validate(agent),
                   provider=provider_schemas.ProviderRead.model_validate(provider),
                   model=provider_schemas.LlmModelRead.model_validate(model),
                   skills=[skill_schemas.SkillBrief.model_validate(skill) for skill in skills],
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
        workspace_instruction = self._workspace.instruction or NO_WORKSPACE_INSTRUCTION
        agent_instruction = self._agent.instruction or NO_AGENT_INSTRUCTION

        builtin_tool_aliases = self._builtin_tool_aliases
        resolved_base_instruction = builtin_tool_aliases.substitute(BASE_INSTRUCTION)
        resolved_workspace_instruction = builtin_tool_aliases.substitute(workspace_instruction)
        resolved_agent_instruction = builtin_tool_aliases.substitute(agent_instruction)
        return AgentContext.ResolvedInstructions(resolved_base_instruction, resolved_workspace_instruction, resolved_agent_instruction)

    @property
    def usage(self) -> ContextUsage:
        return self._usage

    @property
    def system_instruction(self) -> str:
        settings = use_app_setting_manager().settings
        available_skills = AgentContext._format_skills(self._skills)
        resolved_instructions = self._resolve_instructions()
        return resolved_instructions.base.format(
            os_platform=platform.system(),
            user_language=settings.reply_language,
            available_skills=available_skills,
            workspace_name=self._workspace.name,
            workspace_directory=self._workspace.directory,
            workspace_instruction=resolved_instructions.workspace,
            agent_role=self._agent.name,
            agent_instruction=resolved_instructions.agent,
        ).strip()

    @property
    def toolsets(self) -> list[Toolset]:
        return [*self._builtin_toolset_manager.toolsets,
                *self._mcp_toolset_manager.toolsets]

    @property
    def provider(self) -> provider_schemas.ProviderRead:
        return self._provider

    @property
    def model(self) -> provider_schemas.LlmModelRead:
        return self._model

    @property
    def messages(self) -> list[Message]:
        return self._messages

    @property
    def usable_tool_ids(self) -> set[int] | None:
        workspace_usable_tool_ids = {tool.id for tool in self._workspace.usable_tools}
        agent_usable_tool_ids = {tool.id for tool in self._agent.usable_tools}

        if len(workspace_usable_tool_ids) == 0 and len(agent_usable_tool_ids) == 0:
            # both workspace and agent have no usable tools configured, return None meaning no need to filter
            return None

        if len(workspace_usable_tool_ids) == 0:
            return agent_usable_tool_ids
        if len(agent_usable_tool_ids) == 0:
            return workspace_usable_tool_ids
        return workspace_usable_tool_ids & agent_usable_tool_ids

    def find_tool(self, tool_name: str) -> ToolDef | None:
        for toolset in self.toolsets:
            for tool in toolset.get_tools():
                if tool.name == tool_name:
                    return tool
        return None

    async def persist(self):
        async with db_context() as db_session:
            await TaskService(db_session).update_task(self.task_id, task_schemas.TaskUpdate(
                title=None, agent_id=None,
                messages=self._messages,
                usage=self._usage,
                last_run_at=int(time.time())
            ))

import platform
import time
from typing import Self
from dais_sdk import Toolset
from .tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager
from .prompts.instruction import BASE_INSTRUCTION
from .types import ContextUsage
from ..db import db_context
from ..db.models import task as task_models
from ..schemas import (
    agent as agent_schemas,
    workspace as workspace_schemas,
    provider as provider_schemas
)
from ..services.agent import AgentService
from ..services.workspace import WorkspaceService
from ..services.llm_model import LlmModelService
from ..services.provider import ProviderService
from ..services.task import TaskService
from ..schemas import task as task_schemas
from ..settings import use_app_setting_manager

class AgentContext:
    def __init__(self,
                 task_id: int,
                 messages: list[task_models.TaskMessage],
                 workspace: workspace_schemas.WorkspaceRead,
                 agent: agent_schemas.AgentRead,
                 provider: provider_schemas.ProviderRead,
                 model: provider_schemas.LlmModelRead,
                 builtin_toolset_manager: BuiltinToolsetManager,
                 mcp_toolset_manager: McpToolsetManager):
        self.task_id = task_id
        self._workspace = workspace
        self._agent = agent
        self._provider = provider
        self._model = model
        self._messages = messages

        self._usage = ContextUsage.default()
        self._usage.max_tokens = self._model.context_size

        self._builtin_toolset_manager = builtin_toolset_manager
        self._mcp_toolset_manager = mcp_toolset_manager

    @classmethod
    async def create(cls, task: task_schemas.TaskRead) -> Self:
        assert task.agent_id is not None

        messages = task.messages
        async with db_context() as session:
            agent = await AgentService(session).get_agent_by_id(task.agent_id)
            workspace = await WorkspaceService(session).get_workspace_by_id(task.workspace_id)

            assert agent.model_id is not None
            model = await LlmModelService(session).get_model_by_id(agent.model_id)
            provider = await ProviderService(session).get_provider_by_id(model.provider_id)

        builtin_toolset_manager = BuiltinToolsetManager(workspace.directory, ContextUsage.default())
        await builtin_toolset_manager.initialize()
        mcp_toolset_manager = use_mcp_toolset_manager()
        return cls(task.id,
                   messages, workspace, agent, provider, model,
                   builtin_toolset_manager, mcp_toolset_manager)

    @property
    def usage(self) -> ContextUsage:
        return self._usage

    @property
    def system_instruction(self) -> str:
        settings = use_app_setting_manager().settings
        return BASE_INSTRUCTION.format(
            os_platform=platform.system(),
            user_language=settings.reply_language,
            workspace_name=self._workspace.name,
            workspace_directory=self._workspace.directory,
            workspace_instruction=self._workspace.workspace_background,
            agent_role=self._agent.name,
            agent_instruction=self._agent.system_prompt
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
    def messages(self) -> list[task_models.TaskMessage]:
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

    async def persist(self):
        async with db_context() as session:
            await TaskService(session).update_task(self.task_id, task_schemas.TaskUpdate(
                title=None, agent_id=None,
                messages=self._messages,
                usage=self._usage,
                last_run_at=int(time.time())
            ))

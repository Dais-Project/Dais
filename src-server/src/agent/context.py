import platform
import time
from typing import Self
from dais_sdk import Toolset
from .tool import use_mcp_toolset_manager, BuiltinToolsetManager, McpToolsetManager
from .prompts.instruction import BASE_INSTRUCTION
from .types import ContextUsage
from ..db import db_context
from ..db.models import (
    agent as agent_models,
    provider as provider_models,
    workspace as workspace_models,
    task as task_models
)
from ..services.llm_model import LlmModelService
from ..services.provider import ProviderService
from ..services.task import TaskService
from ..schemas import task as task_schemas
from ..settings import use_app_setting_manager

class AgentContext:
    def __init__(self,
                 task_id: int,
                 messages: list[task_models.TaskMessage],
                 workspace: workspace_models.Workspace,
                 agent: agent_models.Agent,
                 provider: provider_models.Provider,
                 model: provider_models.LlmModel,
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
    async def create(cls, task: task_models.Task) -> Self:
        assert task.agent is not None
        assert task.agent_id is not None

        agent = task.agent
        workspace = task.workspace
        messages = task.messages
        async with db_context() as session:
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
    def provider(self) -> provider_models.Provider:
        return self._provider

    @property
    def model(self) -> provider_models.LlmModel:
        return self._model

    @property
    def messages(self) -> list[task_models.TaskMessage]:
        return self._messages

    async def persist(self):
        async with db_context() as session:
            await TaskService(session).update_task(self.task_id, task_schemas.TaskUpdate(
                title=None, agent_id=None,
                messages=self._messages,
                usage=self._usage,
                last_run_at=int(time.time())
            ))

import platform
from liteai_sdk import Toolset
from .tool import use_mcp_toolset_manager, BuiltinToolsetManager
from .prompts.instruction import BASE_INSTRUCTION
from ..db.models import (
    agent as agent_models,
    provider as provider_models,
    workspace as workspace_models,
    task as task_models
)
from ..services.provider import ProviderService

class AgentContext:
    def __init__(self, task: task_models.Task):
        assert task.agent_id is not None
        assert task.agent is not None
        self._workspace = task.workspace
        self._agent = task.agent
        self._model = self._agent.model
        if self._model is None:
            raise ValueError(f"Agent {self._agent.id} has no model")
        
        with ProviderService() as provider_service:
            self._provider = provider_service.get_provider_by_id(self._model.provider_id)

        self._builtin_toolset_manager = BuiltinToolsetManager(self._workspace.directory)
        self._mcp_toolset_manager = use_mcp_toolset_manager()

    @property
    def system_instruction(self) -> str:
        return BASE_INSTRUCTION.format(
            os_platform=platform.system(),
            user_language="zh-CN", # TODO: Get from system settings
            workspace_name=self.workspace.name,
            workspace_directory=self.workspace.directory,
            workspace_instruction=self.workspace.workspace_background,
            agent_instruction=self.agent.system_prompt
        )

    @property
    def toolsets(self) -> list[Toolset]:
        return [*self._builtin_toolset_manager.toolsets,
                *self._mcp_toolset_manager.toolsets]

    @property
    def workspace(self) -> workspace_models.Workspace:
        return self._workspace

    @property
    def agent(self) -> agent_models.Agent:
        return self._agent

    @property
    def provider(self) -> provider_models.Provider:
        return self._provider

    @property
    def model(self) -> provider_models.LlmModel:
        return self._model

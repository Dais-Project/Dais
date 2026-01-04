import platform
from .prompts.instruction import BASE_INSTRUCTION
from ..db.models import agent as agent_models,\
                        provider as provider_models,\
                        workspace as workspace_models
from ..services.agent import AgentService
from ..services.workspace import WorkspaceService
from ..services.llm_model import LlmModelService

class AgentContext:
    def __init__(self, workspace_id: int, agent_id: int):
        self._retrieve(workspace_id, agent_id)
        self._system_instruction = BASE_INSTRUCTION.format(
            os_platform=platform.system(),
            user_language="zh-CN", # TODO: Get from system settings
            workspace_name=self.workspace.name,
            workspace_directory=self.workspace.directory,
            workspace_instruction=self.workspace.workspace_background,
            agent_instruction=self.agent.system_prompt
        )

    @property
    def system_instruction(self) -> str:
        return self._system_instruction

    def _retrieve(self, workspace_id: int, agent_id: int):
        with WorkspaceService() as workspace_service:
            workspace = workspace_service.get_workspace_by_id(workspace_id)
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")
        self._workspace = workspace

        with AgentService() as agent_service:
            agent = agent_service.get_agent_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        self._agent = agent

        with LlmModelService() as llm_model_service:
            model = llm_model_service.get_model_by_id(agent.model_id)
        if not model:
            raise ValueError(f"Model {agent.model_id} not found")

        self._model = model
        self._provider = self._model.provider

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

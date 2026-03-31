import pytest
from src.agent.tool.toolset_wrapper import BuiltInToolset, BuiltInToolsetContext
from src.agent.types import ContextUsage


@pytest.fixture(autouse=True)
def mock_built_in_toolset_init(mocker):
    def _init(self, ctx, toolset_ent=None):
        self._ctx = ctx
        self._tools_cache = []
        self._tool_ent_map = None

    mocker.patch.object(BuiltInToolset, "__init__", _init)


@pytest.fixture
def built_in_toolset_context(temp_workspace):
    return BuiltInToolsetContext(temp_workspace, ContextUsage.default())

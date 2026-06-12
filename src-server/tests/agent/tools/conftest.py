import pytest
from src.agent.tool.toolset_wrapper import BuiltinToolset, BuiltinToolsetContext


@pytest.fixture(autouse=True)
def mock_builtin_toolset_init(mocker):
    def _init(self, ctx, toolset_ent=None):
        self._ctx = ctx
        self._tools_cache = []
        self._tool_ent_map = None

    mocker.patch.object(BuiltinToolset, "__init__", _init)


@pytest.fixture
def builtin_toolset_context(temp_workspace):
    return BuiltinToolsetContext(1, 1, temp_workspace)

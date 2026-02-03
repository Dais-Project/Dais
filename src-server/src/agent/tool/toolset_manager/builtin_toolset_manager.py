from typing import Sequence, override
from dais_sdk import Toolset
from .types import ToolsetManager
from ..builtin_tools import FileSystemToolset
from ....services import ToolsetService

class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, cwd: str):
        with ToolsetService() as toolset_service:
            toolset_ents = toolset_service.get_all_built_in_toolsets()
        self._toolset_map = {toolset.internal_key: toolset
                             for toolset in toolset_ents}
        self._file_system_toolset = FileSystemToolset(cwd)

    @property
    @override
    def toolsets(self) -> Sequence[Toolset]:
        result = []
        for toolset in [self._file_system_toolset]:
            toolset_ent = self._toolset_map[toolset.internal_key]
            if not toolset_ent.is_enabled: continue
            result.append(toolset)
        return result

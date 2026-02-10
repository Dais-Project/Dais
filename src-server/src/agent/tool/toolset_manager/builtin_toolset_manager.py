from typing import Sequence, override
from dais_sdk import Toolset
from .types import ToolsetManager
from ..toolset_wrapper import BuiltInToolset, BuiltInToolsetContext
from ..builtin_tools import FileSystemToolset, OsInteractionsToolset
from ...types import ContextUsage
from ....services import ToolsetService

class BuiltinToolsetManager(ToolsetManager):
    def __init__(self, cwd: str, usage: ContextUsage):
        with ToolsetService() as toolset_service:
            toolset_ents = toolset_service.get_all_built_in_toolsets()
        self._toolset_map = {toolset.internal_key: toolset
                             for toolset in toolset_ents}
        context = BuiltInToolsetContext(cwd, usage)
        self._file_system_toolset = FileSystemToolset(context)
        self._os_interactions_toolset = OsInteractionsToolset(context)

    @staticmethod
    def sync_toolsets():
        toolset_types: list[type[BuiltInToolset]] = [
            FileSystemToolset, OsInteractionsToolset]
        for toolset in toolset_types:
            toolset.sync()

    @property
    @override
    def toolsets(self) -> Sequence[Toolset]:
        result = []
        for toolset in [self._file_system_toolset, self._os_interactions_toolset]:
            toolset_ent = self._toolset_map[toolset.internal_key]
            if not toolset_ent.is_enabled: continue
            result.append(toolset)
        return result

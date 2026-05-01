import re
from typing import cast
from src.agent.tool import BuiltInToolset, BuiltinToolsetManager


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

        return re.sub(r"\$\{(\w+)\}", replacer, text)

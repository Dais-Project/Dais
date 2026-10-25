from typing import override

from ..toolset_wrapper import BuiltinToolset


class BrowserUseToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "BrowserUse"

    @property
    @override
    def description(self) -> str | None:
        return "Toolset for browser interactions."

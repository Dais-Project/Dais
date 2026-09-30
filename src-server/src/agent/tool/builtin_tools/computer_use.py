from typing import override

from ..toolset_wrapper import BuiltinToolset


class ComputerUseToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "ComputerUse"

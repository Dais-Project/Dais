from enum import Enum
from .file_system import FileSystemToolset
from .os_interactions import OsInteractionsToolset
from .user_interaction import UserInteractionToolset
from .execution_control import ExecutionControlToolset
from ..toolset_wrapper import BuiltInToolsetContext

builtin_tool_members = {}
for toolset in [FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset]:
    temp_instance = toolset(BuiltInToolsetContext.default())
    tools = temp_instance.get_tools(namespaced_tool_name=True)
    builtin_tool_members.update({tool.name.upper(): tool.name for tool in tools})
BuiltInTools = Enum("BuiltInTools", builtin_tool_members)

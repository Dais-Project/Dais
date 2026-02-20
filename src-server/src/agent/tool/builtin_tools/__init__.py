from enum import Enum
from typing import TYPE_CHECKING, Iterator, cast
from dais_sdk import ToolSchema
from dais_sdk.tool.prepare import prepare_tools
from .file_system import FileSystemToolset
from .os_interactions import OsInteractionsToolset
from .user_interaction import UserInteractionToolset
from .execution_control import ExecutionControlToolset
from ..toolset_wrapper import BuiltInToolsetContext

def get_builtin_tool_enum() -> type[Enum]:
    builtin_tool_members = {}
    for toolset in [FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset]:
        temp_instance = toolset(BuiltInToolsetContext.default())
        # use get_original_tools instead of get_tools
        # to get the original tools without any filtering
        # and avoid database dependency
        tools = temp_instance.get_original_tools(namespaced_tool_name=True)
        builtin_tool_members.update({tool.name.upper(): tool.name
                                     for tool in tools})
    BuiltInTools = Enum("BuiltInTools", builtin_tool_members)
    return BuiltInTools

def get_builtin_tool_arg_schemas() -> list[ToolSchema]:
    result = []
    for toolset in [FileSystemToolset, OsInteractionsToolset, UserInteractionToolset, ExecutionControlToolset]:
        temp_instance = toolset(BuiltInToolsetContext.default())
        tools = temp_instance.get_original_tools(namespaced_tool_name=True)
        # only append the parameters schema
        result.extend(prepare_tools(tools))
    return result

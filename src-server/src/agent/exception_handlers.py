from dais_sdk import ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError
from dais_sdk.tool.utils import get_tool_name

def handle_tool_does_not_exist_error(e: ToolDoesNotExistError) -> str:
    return f"[System] Tool '{e.tool_name}' does not exist."

def handle_tool_argument_decode_error(e: ToolArgumentDecodeError) -> str:
    return f"[System] Failed to decode tool arguments: {e}"

def handle_tool_execution_error(e: ToolExecutionError) -> str:
    return f"""
[System] Failed to execute tool:
Tool name: {get_tool_name(e.tool)}
Tool arguments: {e.arguments}
Error: {e.raw_error}
""".strip()

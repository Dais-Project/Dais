from dais_sdk import ToolDoesNotExistError, ToolArgumentDecodeError, ToolExecutionError

def handle_tool_does_not_exist_error(e: ToolDoesNotExistError) -> str:
    return f"[System] Tool '{e.tool_name}' does not exist."

def handle_tool_argument_decode_error(e: ToolArgumentDecodeError) -> str:
    return f"[System] Failed to decode tool arguments: {e}"

def handle_tool_execution_error(e: ToolExecutionError) -> str:
    return f"[System] Failed to execute tool: {e}"

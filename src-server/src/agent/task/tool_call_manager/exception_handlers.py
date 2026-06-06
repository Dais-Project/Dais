from dais_sdk.types import ToolDoesNotExistError, ToolArgumentParsingError, ToolResultSerializationError, ToolExecutionError

def handle_tool_does_not_exist_error(e: ToolDoesNotExistError) -> str:
    return f"[System] Tool '{e.tool_name}' does not exist."

def handle_tool_argument_parsing_error(e: ToolArgumentParsingError) -> str:
    return f"[System] Failed to parse tool arguments: {e}"

def handle_tool_result_serialization_error(e: ToolResultSerializationError) -> str:
    return f"[System] Failed to serialize tool result: {e}"

def handle_tool_execution_error(e: ToolExecutionError) -> str:
    return f"[System] Failed to execute tool:\n{e.raw_error}"

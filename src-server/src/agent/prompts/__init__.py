from .instruction import BASE_INSTRUCTION
from .title_summarization import TITLE_SUMMARIZATION_INSTRUCTION
from .built_in_agents import *

USER_IGNORED_TOOL_CALL_RESULT = "[System Message] User ignored this tool call."
USER_DENIED_TOOL_CALL_RESULT = "[System Message] User denied this tool call."

NO_WORKSPACE_INSTRUCTION = "[System Message] The user did not set any workspace instruction."
NO_AGENT_INSTRUCTION = "[System Message] The user did not set any agent instruction."

from .instruction import BASE_INSTRUCTION
from .one_turns import *
from .built_in_agents import *

USER_IGNORED_TOOL_CALL_RESULT = "[System] User ignored this tool call."
USER_DENIED_TOOL_CALL_RESULT = "[System] User denied this tool call."

NO_AVAILABLE_SKILLS = "[System] There are no available skills."
NO_WORKSPACE_INSTRUCTION = "[System] The user did not set any workspace instruction."
NO_AGENT_INSTRUCTION = "[System] The user did not set any agent instruction."

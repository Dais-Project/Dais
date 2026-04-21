from .instruction import BASE_INSTRUCTION
from .one_turns import *
from .built_in_agents import *

USER_IGNORED_TOOL_CALL_RESULT = "[System] User ignored this tool call."
USER_DENIED_TOOL_CALL_RESULT = "[System] User denied this tool call."

NO_AVAILABLE_SKILLS = "[System] There are no available skills."
FAILED_TO_LOAD_NOTES_INDEX = "[System] Failed to load the workspace notes index. If note retrieval is needed, fall back to reading `$DAIS_NOTES_DIR/NOTES.md` directly."
NO_WORKSPACE_INSTRUCTION = "[System] The user did not set any workspace instruction."
NO_AGENT_INSTRUCTION = "[System] The user did not set any agent instruction."

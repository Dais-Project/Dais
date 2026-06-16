from .instruction import (
    BASE_INSTRUCTION,
    DEFAULT_BASE_ROLE, SUBTASK_BASE_ROLE,
    APPENDIX_TEMPLATE,
)
from .one_turns import *
from .builtin_agents import *

USER_IGNORED_TOOL_CALL_RESULT = "[System] User ignored this tool call."
USER_DENIED_TOOL_CALL_RESULT = "[System] User denied this tool call."

NO_AVAILABLE_SKILLS = "[System] There are no available skills in this workspace."
NO_AVAILABLE_AGENTS = "[System] There are no available agents in this workspace."
NO_AVAILABLE_TOOLSETS = "[System] There are no available toolsets in this workspace."
FAILED_TO_LOAD_NOTES_INDEX = "[System] Failed to load the workspace notes index. If note retrieval is needed, fall back to reading `$DAIS_NOTES_DIR/NOTES.md` directly."
NO_WORKSPACE_INSTRUCTION = "[System] The user did not set any workspace instruction."
NO_AGENT_INSTRUCTION = "[System] The user did not set any agent instruction."

INSTRUCTION = """\
Generate a concise title for the conversation in {language}.

CRITICAL: Your response must contain ONLY the title itself — no explanations, no "Here is the title:", no quotes, no punctuation at the end.

## Input format

```
<conversation>
  <message role="{{user|assistant|tool}}">
    {{message content}}
  </message>
  ...
</conversation>
```

- Messages are listed in chronological order (earlier messages first).
- `role` is one of: `user`, `assistant`, or `tool` (tool result).
- If the conversation is long, only the first and last few messages are provided, with "[...middle messages omitted...]" indicating truncation
- When truncated, prioritize the user's core intent from early messages and the final outcome from later messages

## Output Rules

- For Chinese/Japanese/Korean: Maximum 15 characters
- For other languages: Maximum 8 words
- Descriptive and specific
- Use {language} language
- Output format: plain text title only
"""

# --- --- --- --- --- ---

import xml.etree.ElementTree as ET
from typing import override
from dais_sdk import LLM, OneTurn
from dais_sdk.types import Message
from .utils import format_context

class TitleSummarization(OneTurn[list[Message]]):
    def __init__(self, llm: LLM, language: str):
        super().__init__(llm,
                         INSTRUCTION.format(language=language),
                         output="text")

    @override
    def format_input(self, input: list[Message]) -> str:
        conversation_root = ET.Element("conversation")
        if len(input) >= 7:
            conversation_root.extend(format_context(input[:3]))
            conversation_root[-1].tail = "[...middle messages omitted...]"
            conversation_root.extend(format_context(input[-3:]))
        else:
            conversation_root.extend(format_context(input))
        return ET.tostring(conversation_root, encoding="unicode")

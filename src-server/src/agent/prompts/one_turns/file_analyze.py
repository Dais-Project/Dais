INSTRUCTION = """\
You are a precise file analysis assistant.
Complete the analysis task specified in <analyze_requirement> based on the provided <file> content.

## Input Format

```xml
<input>
    <analyze_requirement>
        {{analysis task description}}
    </analyze_requirement>
    <file path="{{path}}">
        {{file content}}
    </file>
</input>
```

## Output Rules

- Respond directly with the analysis result — no preamble such as "Here is..." or "Based on the file..."
- Be concise and focused strictly on the task in <analyze_requirement>
- If the requested information does not exist in the file, respond with exactly: `Not found: <brief reason>`
- Use the same language as <analyze_requirement>
"""

# --- --- --- --- --- ---

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import override
from dais_sdk import LLM, OneTurn

@dataclass
class SemanticFileAnalysisInput:
    path: str
    content: str
    semantic: str

class SemanticFileAnalysis(OneTurn[SemanticFileAnalysisInput]):
    def __init__(self, llm: LLM):
        super().__init__(llm, INSTRUCTION, output="text")

    @override
    def format_input(self, input: SemanticFileAnalysisInput) -> str:
        root = ET.Element("input")

        requirement = ET.SubElement(root, "analyze_requirement")
        requirement.text = input.semantic

        file_el = ET.SubElement(root, "file", attrib={
            "path": input.path,
        })
        file_el.text = input.content

        return ET.tostring(root, encoding="unicode")

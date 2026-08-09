import xml.etree.ElementTree as ET

import pytest

from src.agent.tool.builtin_tools.orchestration import compose_subtask_result
from src.agent.types import TaskFinished


@pytest.mark.tool
class TestSubtaskResult:
    def test_finished_result_includes_assistant_message_before_summary(self):
        subtask = type("Subtask", (), {"id": 7, "todos": None})()

        result = compose_subtask_result(
            subtask,
            TaskFinished(
                summary="Concise completion summary.",
                detail="Detailed findings from the subtask.",
            ),
        )

        root = ET.fromstring(result)
        assert root.attrib == {"subtask_id": "7", "status": "finished"}
        assert root.text is None
        assert root.findtext("detail") == "Detailed findings from the subtask."
        assert root.findtext("summary") == "Concise completion summary."

    def test_finished_result_without_assistant_message_keeps_summary(self):
        subtask = type("Subtask", (), {"id": 8, "todos": None})()

        result = compose_subtask_result(
            subtask,
            TaskFinished(summary="Concise completion summary."),
        )

        root = ET.fromstring(result)
        assert root.attrib == {"subtask_id": "8", "status": "finished"}
        assert root.text == "Concise completion summary."


from src.agent.tool.builtin_tools.utils import truncate_output


class TestTruncateOutput:
    def test_no_truncation_returns_original(self):
        text = "short text"
        assert truncate_output(text, 100) == text

    def test_truncation_includes_note_and_preserves_ends(self):
        text = "A" * 200
        result = truncate_output(text, 80)

        assert result.startswith("A")
        assert result.endswith("A")
        assert "Truncated" in result

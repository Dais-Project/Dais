from src.utils.to_base64_str import to_base64_str


class TestToBase64Str:
    def test_encodes_bytes_to_base64_utf8_string(self):
        result = to_base64_str(b"hello world")

        assert result == "aGVsbG8gd29ybGQ="

    def test_returns_empty_string_for_empty_bytes(self):
        result = to_base64_str(b"")

        assert result == ""

import uuid

from src.utils.get_unique_filename import get_unique_filename


class TestGetUniqueFilename:
    def test_returns_uuid_hex_with_original_extension(self, mocker):
        fake_uuid = mocker.MagicMock()
        fake_uuid.hex = "abc123def456"
        mocker.patch.object(uuid, "uuid4", return_value=fake_uuid)

        result = get_unique_filename("report.pdf")

        assert result == "abc123def456.pdf"

    def test_returns_uuid_hex_without_extension_when_original_name_has_no_suffix(self, mocker):
        fake_uuid = mocker.MagicMock()
        fake_uuid.hex = "abc123def456"
        mocker.patch.object(uuid, "uuid4", return_value=fake_uuid)

        result = get_unique_filename("README")

        assert result == "abc123def456"

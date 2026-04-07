import pytest

from src.parent_watchdog import ParentWatchdog


@pytest.mark.tool
class TestParentWatchdog:
    def test_run_skips_when_stdin_is_tty(self, mocker):
        callback = mocker.MagicMock()
        fake_stdin = mocker.MagicMock()
        fake_stdin.isatty.return_value = True

        mocker.patch("src.parent_watchdog.sys.stdin", fake_stdin)

        watchdog = ParentWatchdog(callback)
        watchdog.run()

        callback.assert_not_called()

    def test_run_calls_callback_when_parent_stdin_closes(self, mocker):
        callback = mocker.MagicMock()
        fake_stdin = mocker.MagicMock()
        fake_stdin.isatty.return_value = False
        fake_stdin.buffer.read.side_effect = [b"a", b""]

        mocker.patch("src.parent_watchdog.sys.stdin", fake_stdin)

        watchdog = ParentWatchdog(callback)
        watchdog.run()

        callback.assert_called_once_with()

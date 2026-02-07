import subprocess
import pytest
from pathlib import Path
from src.agent.tool.builtin_tools.code_execution import CodeExecutionToolset
from src.agent.tool.builtin_tools.code_execution import BuiltInToolset
from src.agent.types import ContextUsage


@pytest.fixture(autouse=True)
def mock_built_in_toolset_init(mocker):
    mocker.patch.object(BuiltInToolset, "__init__", return_value=None)


class TestCodeExecutionShell:
    def test_shell_success_strips_output_and_passes_args(self, mocker):
        base_cwd = Path.cwd()
        tool = CodeExecutionToolset(base_cwd, ContextUsage(max_tokens=128000))
        mock_run = mocker.patch("subprocess.run")
        mock_process = mocker.MagicMock()
        mock_process.stdout = b"  ok \n"
        mock_run.return_value = mock_process

        cwd = Path("some/path")
        current_dir = base_cwd / cwd
        result = tool.shell("echo", args=["hello"], cwd=str(cwd), timeout=5)

        assert result == f"[Context: Current directory is {current_dir}]\nok"
        mock_run.assert_called_once_with(
            ["echo", "hello"],
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=current_dir,
            timeout=5,
        )

    def test_shell_truncates_output(self, mocker):
        tool = CodeExecutionToolset(Path.cwd(), ContextUsage(max_tokens=128000))
        mock_run = mocker.patch("subprocess.run")
        mock_process = mocker.MagicMock()
        output = "A" * 200000
        mock_process.stdout = f"{output}\n".encode()
        mock_run.return_value = mock_process

        result = tool.shell("echo")

        assert "Truncated" in result

    def test_shell_nonzero_exit_returns_stdout(self, mocker):
        tool = CodeExecutionToolset(Path.cwd(), ContextUsage(max_tokens=128000))
        mock_run = mocker.patch("subprocess.run")
        error = subprocess.CalledProcessError(1, "badcmd", output=b"error output\n")
        mock_run.side_effect = error

        result = tool.shell("badcmd")

        assert result == "error output\n"

    def test_shell_timeout_raises_timeout_error(self, mocker):
        tool = CodeExecutionToolset(Path.cwd(), ContextUsage(max_tokens=128000))
        mock_run = mocker.patch("subprocess.run")
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="sleep", timeout=1)

        with pytest.raises(TimeoutError) as exc_info:
            tool.shell("sleep", timeout=1)

        assert "Command timed out after 1 seconds." in str(exc_info.value)

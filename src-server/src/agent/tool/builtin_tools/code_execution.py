import subprocess
from pathlib import Path
from .utils import truncate_output, resolve_cwd
from ..toolset_wrapper import built_in_tool, BuiltInToolset
from ...types import ContextUsage
from ...constants import CHAR_TOKEN_RATIO

class CodeExecutionToolset(BuiltInToolset):
    def __init__(self, cwd: str | Path, usage: ContextUsage):
        super().__init__()
        self.cwd = resolve_cwd(cwd)
        self._usage = usage

    @property
    def name(self) -> str: return "CodeExecution"

    # implementation reference: https://github.com/langchain-ai/langchain-experimental/blob/d1f445dc7fd1bf207cd6c9752f7977559c73bf04/libs/experimental/langchain_experimental/llm_bash/bash.py#L15
    @built_in_tool
    def shell(self,
              command: str,
              args: list[str] = [],
              cwd: str = ".",
              timeout: int = 30,
              ) -> str:
        """
        Request to execute a shell command.
        Use this when you need to execute a shell command and get the output of the command.
        **IMPORTANT**: Use PowerShell on Windows and bash on Unix-like systems.

        Args:
            command: (required) The command to execute.
            args: (optional, default: []) The arguments of the command.
            cwd: (optional, default: ".") The current working directory to execute the command in.
            timeout: (optional, default: 30) The timeout of the command execution in seconds.

        Returns:
            The output of the command.
        """
        max_output_len = min(
            int(self._usage.remaining_tokens / 4) * CHAR_TOKEN_RATIO,
            12000,
        )
        current_dir = self.cwd / cwd

        try:
            output = subprocess.run(
                [command, *args],
                shell=True,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=current_dir,
                timeout=timeout,
            ).stdout.decode()
        except subprocess.CalledProcessError as error:
            return error.stdout.decode()
        except subprocess.TimeoutExpired as error:
            raise TimeoutError(f"Command timed out after {timeout} seconds.")

        system_info = f"[Context: Current directory is {current_dir}]"
        output = f"{system_info}\n{output.strip()}"
        return truncate_output(output, max_output_len)

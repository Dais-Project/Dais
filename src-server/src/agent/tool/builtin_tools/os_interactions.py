import time
from typing import Annotated, TypedDict, override
from itertools import islice
from dais_shell import (
    AgentShell, CommandStep,
    ShellResultStatus as AgentShellResultStatus
)
from dais_shell.iostream_reader import IOStreamBuffer
from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext
from ....db.models import toolset as toolset_models

class ShellResult(TypedDict):
    stdout: str
    stderr: str
    stdout_truncated: bool
    stderr_truncated: bool
    returncode: int
    status: AgentShellResultStatus
    duration: str

class OsInteractionsToolset(BuiltInToolset):
    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)
        self._shell = AgentShell()

    @property
    @override
    def name(self) -> str: return "OsInteractions"

    @built_in_tool(validate=True)
    async def shell(self,
                    command: Annotated[str,
                        "The command to execute. Do not pass shell executables (e.g., powershell, pwsh, bash, sh, zsh, cmd)."],
                    args: Annotated[list[str] | None,
                        "(Default: None) The arguments for the command."] = None,
                    cwd: Annotated[str,
                        "(Default: \".\") The working directory to execute the command in, relative to the current working directory."] = ".",
                    timeout: Annotated[int,
                        "(Default: 30) Timeout for command execution in seconds."] = 30
                    ) -> ShellResult:
        """
        Request to execute a shell command.
        This tool receives PowerShell commands on Windows and bash commands on Linux and MacOS.
        This is a LOW PRIORITY tool - only use this tool when no suitable specialized tool is available.

        IMPORTANT:
            - DO NOT pass shell executables (e.g., powershell, pwsh, bash, sh, zsh, cmd) as the command. If passed, the tool will reject the request for security reasons
            - DO NOT use shell operators such as `&&`, `||`, `|`, `;`, `>`, `>>`, `<`, `2>&1`

        Returns:
            A JSON object containing the output of the command.
            The object has the following properties:
            - stdout: The standard output of the command
            - stderr: The standard error output of the command
            - stdout_truncated: Whether the stdout is truncated
            - stderr_truncated: Whether the stderr is truncated
            - returncode: The return code of the command
            - status: The status of the command execution
            - duration: The duration of the command execution in seconds

        Note:
            If the original stdout or stderr is too long, it will be automatically truncated, keeping the first N and last N lines.
            A marker like `[... X lines truncated ...]` will indicate where the content was cut.
        """

        def truncate_output(buffer: IOStreamBuffer, max_lines: int, head_lines: int, tail_lines: int) -> tuple[bool, str]:
            """
            Returns:
                Tuple of:
                - Whether the output is truncated.
                - The truncated output.
            """
            buffer_len = len(buffer)
            is_truncated = buffer_len > max_lines
            if not is_truncated:
                return False, "\n".join(buffer)

            truncated_lines = buffer_len - head_lines - tail_lines
            head = islice(buffer, head_lines)
            tail = islice(buffer, buffer_len - tail_lines, buffer_len)
            return True, "\n".join([
                *head,
                f"[... {truncated_lines} lines truncated ...]",
                *tail])

        STDOUT_MAX_OUTPUT_LINES = 1000
        STDERR_MAX_OUTPUT_LINES = 500
        HEAD_LINES = 200
        TAIL_LINES = 200

        step = CommandStep(command=command,
                           args=args or [],
                           cwd=self._ctx.cwd / cwd,
                           timeout=timeout)
        start_time = time.monotonic()
        result = await self._shell.run(step)
        duration = time.monotonic() - start_time

        stdout_truncated, stdout_result = truncate_output(result.stdout_buf, STDOUT_MAX_OUTPUT_LINES, HEAD_LINES, TAIL_LINES)
        stderr_truncated, stderr_result = truncate_output(result.stderr_buf, STDERR_MAX_OUTPUT_LINES, HEAD_LINES, TAIL_LINES)

        return {
            "stdout": stdout_result,
            "stderr": stderr_result,
            "stdout_truncated": stdout_truncated,
            "stderr_truncated": stderr_truncated,
            "returncode": result.returncode,
            "status": result.status,
            "duration": f"{duration}s",
        }

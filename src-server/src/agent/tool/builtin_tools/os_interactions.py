import inspect
import time
import xml.etree.ElementTree as ET
from typing import Annotated, override
from itertools import islice
from dais_shell import AgentShell, CommandStep
from dais_shell.iostream_reader import IOStreamBuffer
from src.agent.skills import SkillMaterializer
from src.db.models import toolset as toolset_models
from src.binaries import UV_PATH, NODE_PATH
from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext
from ...notes import NoteManager


class OsInteractionsToolset(BuiltInToolset):
    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)
        self._shell = AgentShell(
            extra_paths=[str(NODE_PATH.parent), str(UV_PATH.parent)],
            extra_env={
                **SkillMaterializer.get_skill_dir_env(),
                **NoteManager.get_notes_dir_env(ctx.workspace_id),
            }
        )

    @property
    @override
    def name(self) -> str: return "OsInteractions"

    @built_in_tool(validate=True)
    async def shell(self,
                    command: Annotated[str,
                        "The command to execute. Do not pass shell executables (e.g., powershell, pwsh, bash, sh, zsh, cmd)."],
                    args: Annotated[list[str] | None,
                        "The arguments for the command."] = None,
                    cwd: Annotated[str,
                        "The working directory to execute the command in, relative to the current working directory."] = ".",
                    timeout: Annotated[int,
                        "Timeout for command execution in seconds."] = 30
                    ) -> str:
        """
        Execute a shell command.
        This tool receives PowerShell commands on Windows and bash commands on Linux and MacOS.
        This is a LOW PRIORITY tool — only use this tool when no suitable specialized tool is available.

        IMPORTANTS:
            - DO NOT pass shell executables (e.g., powershell, pwsh, bash, sh, zsh, cmd) as the command. If passed, the tool will reject the request for security reasons
            - DO NOT use shell operators such as `&&`, `||`, `|`, `;`, `>`, `>>`, `<`, `2>&1`

        Examples:
            # Run: python script.py --verbose --output /tmp/out.txt
            shell(command="python", args=["script.py", "--verbose", "--output", "/tmp/out.txt"])

            # Run: ls -la /tmp
            shell(command="ls", args=["-la", "/tmp"])

        Returns:
            A XML string with the command result and metadata as attributes:
            - status: The status of the command execution.
            - returncode: The return code of the command.
            - duration: The duration of the command execution in seconds.
            - stdout: Standard output of the command, with a truncated attribute indicating whether it was truncated.
            - stderr: Standard error output of the command, with a truncated attribute indicating whether it was truncated.

            Example:
                <shell_result status="success" returncode="0" duration="1.23s">
                    <stdout truncated="false">Hello World</stdout>
                    <stderr truncated="false"></stderr>
                </shell_result>

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

        if " " in command:
            raise ValueError(
                inspect.cleandoc(
                f"""
                Invalid command "{command}": `command` must be the executable only (e.g., "python"). 
                Move arguments to the `args` parameter. 
                This tool call should be: shell(command="{command.split()[0]}", args={command.split()[1:]})
                """
            ))

        step = CommandStep(command=command,
                           args=args or [],
                           cwd=self._ctx.cwd / cwd,
                           timeout=timeout)
        start_time = time.monotonic()
        result = await self._shell.run(step)
        duration = time.monotonic() - start_time

        stdout_truncated, stdout_result = truncate_output(result.stdout_buf, STDOUT_MAX_OUTPUT_LINES, HEAD_LINES, TAIL_LINES)
        stderr_truncated, stderr_result = truncate_output(result.stderr_buf, STDERR_MAX_OUTPUT_LINES, HEAD_LINES, TAIL_LINES)

        # format xml result
        root = ET.Element("shell_result", attrib={
            "status": result.status,
            "returncode": str(result.returncode),
            "duration": f"{duration:.2f}s",
        })
        stdout_el = ET.SubElement(root, "stdout", attrib={"truncated": str(stdout_truncated).lower()})
        stdout_el.text = stdout_result
        stderr_el = ET.SubElement(root, "stderr", attrib={"truncated": str(stderr_truncated).lower()})
        stderr_el.text = stderr_result
        return ET.tostring(root, encoding="unicode")

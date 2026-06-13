from pathlib import Path
import re
import textwrap

import pytest
from src.agent.tool.builtin_tools.os_interactions import OsInteractionsToolset


def _parse_attribs(attrib_str: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for m in re.finditer(r'(\w+)="([^"]*)"', attrib_str):
        result[m.group(1)] = m.group(2)
    return result


def parse_shell_result(result: str) -> tuple[dict[str, str], dict[str, str], str, dict[str, str], str]:
    root_match = re.search(r"^<shell_result\s+(.*?)>", result)
    assert root_match is not None, "shell_result tag not found"
    root_attrib = _parse_attribs(root_match.group(1))

    stdout_match = re.search(r"<stdout\s+([^>]*)>(.*?)</stdout>", result, re.DOTALL)
    assert stdout_match is not None, "stdout tag not found"
    stdout_attrib = _parse_attribs(stdout_match.group(1))
    stdout_text = stdout_match.group(2)

    stderr_match = re.search(r"<stderr\s+([^>]*)>(.*?)</stderr>", result, re.DOTALL)
    assert stderr_match is not None, "stderr tag not found"
    stderr_attrib = _parse_attribs(stderr_match.group(1))
    stderr_text = stderr_match.group(2)

    return root_attrib, stdout_attrib, stdout_text, stderr_attrib, stderr_text


@pytest.mark.tool
class TestOsInteractionsShell:
    @pytest.mark.asyncio
    async def test_shell_executes_command(self, builtin_toolset_context):
        tool = OsInteractionsToolset(builtin_toolset_context)

        result = await tool.shell(
            command="python",
            args=["-c", "print('hello'); import sys; sys.stderr.write('oops')"],
        )
        root_attrib, stdout_attrib, stdout_text, stderr_attrib, stderr_text = parse_shell_result(result)

        assert root_attrib["returncode"] == "0"
        assert root_attrib["status"]
        assert float(root_attrib["duration"]) >= 0
        assert stdout_attrib["truncated"] == "false"
        assert stderr_attrib["truncated"] == "false"
        assert "hello" in stdout_text
        assert "oops" in stderr_text

    @pytest.mark.asyncio
    async def test_shell_respects_cwd(self, builtin_toolset_context, temp_workspace):
        target_dir: Path = temp_workspace / "subdir"
        target_dir.mkdir()
        (target_dir / "cwd.txt").write_text("from-cwd", encoding="utf-8")

        tool = OsInteractionsToolset(builtin_toolset_context)
        result = await tool.shell(
            command="python",
            args=["-c", "from pathlib import Path; print(Path('cwd.txt').read_text())"],
            cwd=str(target_dir),
        )
        _, _, stdout_text, _, _ = parse_shell_result(result)
        assert "from-cwd" in stdout_text

    @pytest.mark.asyncio
    async def test_shell_truncates_stdout_and_stderr(self, builtin_toolset_context):
        tool = OsInteractionsToolset(builtin_toolset_context)
        script = textwrap.dedent(
            """
            import sys
            for i in range(1200):
                print(f"line {i}")
            for i in range(600):
                print(f"err {i}", file=sys.stderr)
            """
        ).strip()

        result = await tool.shell(command="python", args=["-c", script])
        _, stdout_attrib, stdout_text, stderr_attrib, stderr_text = parse_shell_result(result)

        assert stdout_attrib["truncated"] == "true"
        assert stderr_attrib["truncated"] == "true"
        assert "line 0" in stdout_text
        assert "line 1199" in stdout_text
        assert "[... " in stdout_text
        assert "err 0" in stderr_text
        assert "err 599" in stderr_text
        assert "[... " in stderr_text

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "command,args",
        [
            ("python -c", ["print('x')"]),
            ("cmd /c dir", []),
        ],
        ids=["python-inline-args", "cmd-inline-args"],
    )
    async def test_shell_rejects_command_with_inline_arguments(
        self,
        builtin_toolset_context,
        command: str,
        args: list[str],
    ):
        tool = OsInteractionsToolset(builtin_toolset_context)

        with pytest.raises(ValueError, match="must be the executable only"):
            await tool.shell(command=command, args=args)

    @pytest.mark.asyncio
    async def test_shell_xml_special_chars_in_output_should_not_be_escaped(self, builtin_toolset_context):
        """Execute a command whose stdout and stderr contain XML special characters
        and verify the output preserves them literally without XML escaping.
        """
        tool = OsInteractionsToolset(builtin_toolset_context)

        result = await tool.shell(
            command="python",
            args=["-c", "print('<div>test</div>'); import sys; sys.stderr.write('a & b')"],
        )

        assert "<div>test</div>" in result, (
            "BUG: shell output should contain literal '<' and '>' but "
            "they were escaped to &lt; and &gt;"
        )
        assert "a & b" in result, (
            "BUG: shell output should contain literal '&' but "
            "it was escaped to &amp;"
        )
        assert "&lt;" not in result
        assert "&gt;" not in result
        assert "&amp;" not in result

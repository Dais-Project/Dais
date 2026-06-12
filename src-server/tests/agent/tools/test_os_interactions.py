from pathlib import Path
import textwrap
import xml.etree.ElementTree as ET

import pytest
from src.agent.tool.builtin_tools.os_interactions import OsInteractionsToolset


def parse_shell_result(result: ET.Element) -> tuple[ET.Element, ET.Element, ET.Element]:
    root = result
    stdout_el = root.find("stdout")
    stderr_el = root.find("stderr")
    assert stdout_el is not None
    assert stderr_el is not None
    return root, stdout_el, stderr_el


@pytest.mark.tool
class TestOsInteractionsShell:
    @pytest.mark.asyncio
    async def test_shell_executes_command(self, builtin_toolset_context):
        tool = OsInteractionsToolset(builtin_toolset_context)

        result = await tool.shell(
            command="python",
            args=["-c", "print('hello'); import sys; sys.stderr.write('oops')"],
        )
        root, stdout_el, stderr_el = parse_shell_result(result)

        assert root.tag == "shell_result"
        assert root.attrib["returncode"] == "0"
        assert root.attrib["status"]
        assert root.attrib["duration"].endswith("s")
        assert float(root.attrib["duration"].removesuffix("s")) >= 0
        assert stdout_el.attrib["truncated"] == "false"
        assert stderr_el.attrib["truncated"] == "false"
        assert "hello" in (stdout_el.text or "")
        assert "oops" in (stderr_el.text or "")

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
        _, stdout_el, _ = parse_shell_result(result)
        assert "from-cwd" in (stdout_el.text or "")

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
        _, stdout_el, stderr_el = parse_shell_result(result)

        stdout_text = stdout_el.text or ""
        stderr_text = stderr_el.text or ""

        assert stdout_el.attrib["truncated"] == "true"
        assert stderr_el.attrib["truncated"] == "true"
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
        and verify the output does NOT escape them.  This is a regression test for
        a known bug: ET.Element serialization currently escapes <, >, & into &lt;,
        &gt;, &amp; when the framework calls ET.tostring() on the result.
        """
        tool = OsInteractionsToolset(builtin_toolset_context)

        result = await tool.shell(
            command="python",
            args=["-c", "print('<div>test</div>'); import sys; sys.stderr.write('a & b')"],
        )
        root, stdout_el, stderr_el = parse_shell_result(result)

        raw_xml = ET.tostring(result, encoding="unicode")
        assert "<div>test</div>" in raw_xml, (
            "BUG: shell output should contain literal '<' and '>' but "
            "ET.tostring() escapes them to &lt; and &gt;"
        )
        assert "a & b" in raw_xml, (
            "BUG: shell output should contain literal '&' but "
            "ET.tostring() escapes it to &amp;"
        )
        assert "&lt;" not in raw_xml
        assert "&gt;" not in raw_xml
        assert "&amp;" not in raw_xml

        # Regardless of the serialization bug, the parsed ET.Element must still
        # faithfully represent the command output.
        assert "<div>test</div>" in (stdout_el.text or "")
        assert "a & b" in (stderr_el.text or "")

from pathlib import Path
import textwrap
import xml.etree.ElementTree as ET

import pytest
from src.agent.tool.builtin_tools.os_interactions import OsInteractionsToolset
from src.agent.tool.toolset_wrapper import BuiltInToolset, BuiltInToolsetContext
from src.agent.types import ContextUsage


@pytest.fixture(autouse=True)
def mock_built_in_toolset_init(mocker):
    def _init(self, ctx, toolset_ent=None):
        self._ctx = ctx
        self._tools_cache = []
        self._tool_ent_map = None

    mocker.patch.object(BuiltInToolset, "__init__", _init)


@pytest.fixture
def built_in_toolset_context(temp_workspace):
    return BuiltInToolsetContext(temp_workspace, ContextUsage.default())


def parse_shell_result(result: str) -> tuple[ET.Element, ET.Element, ET.Element]:
    root = ET.fromstring(result)
    stdout_el = root.find("stdout")
    stderr_el = root.find("stderr")
    assert stdout_el is not None
    assert stderr_el is not None
    return root, stdout_el, stderr_el


class TestOsInteractionsShell:
    @pytest.mark.asyncio
    async def test_shell_executes_command(self, built_in_toolset_context):
        tool = OsInteractionsToolset(built_in_toolset_context)

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
    async def test_shell_respects_cwd(self, built_in_toolset_context, temp_workspace):
        target_dir: Path = temp_workspace / "subdir"
        target_dir.mkdir()
        (target_dir / "cwd.txt").write_text("from-cwd", encoding="utf-8")

        tool = OsInteractionsToolset(built_in_toolset_context)
        result = await tool.shell(
            command="python",
            args=["-c", "from pathlib import Path; print(Path('cwd.txt').read_text())"],
            cwd=str(target_dir),
        )
        _, stdout_el, _ = parse_shell_result(result)
        assert "from-cwd" in (stdout_el.text or "")

    @pytest.mark.asyncio
    async def test_shell_truncates_stdout_and_stderr(self, built_in_toolset_context):
        tool = OsInteractionsToolset(built_in_toolset_context)
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
        assert "[..." in stdout_text
        assert "err 0" in stderr_text
        assert "err 599" in stderr_text
        assert "[..." in stderr_text

    @pytest.mark.asyncio
    async def test_shell_rejects_command_with_space(self, built_in_toolset_context):
        tool = OsInteractionsToolset(built_in_toolset_context)

        with pytest.raises(ValueError):
            await tool.shell(command="python -c", args=["print('x')"])

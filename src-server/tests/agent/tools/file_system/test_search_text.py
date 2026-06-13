import asyncio
from pathlib import Path

import pytest

from src.agent.tool.builtin_tools.file_system import FileSystemToolset


class FakeRipgrepProcess:
    returncode = 0

    async def communicate(self):
        return b"sample.txt\n1:matched output\n", b""


@pytest.mark.tool
class TestSearchText:
    @pytest.mark.asyncio
    async def test_search_text_passes_max_columns_options_to_ripgrep(
        self,
        builtin_toolset_context,
        monkeypatch,
        temp_workspace: Path,
    ):
        captured_call = {}

        async def fake_create_subprocess_exec(command, *args, **kwargs):
            captured_call["command"] = command
            captured_call["args"] = args
            captured_call["kwargs"] = kwargs
            return FakeRipgrepProcess()

        monkeypatch.setattr(
            asyncio,
            "create_subprocess_exec",
            fake_create_subprocess_exec,
        )

        tool = FileSystemToolset(builtin_toolset_context)
        result = await tool.search_text("matched", path=".")

        assert result == "sample.txt\n1:matched output\n"
        assert captured_call["args"] == (
            "-n",
            "-C",
            "2",
            "-m",
            "30",
            "--path-separator",
            "/",
            "--smart-case",
            "--max-columns",
            "300",
            "--max-columns-preview",
            "matched",
            str(temp_workspace),
        )
        assert captured_call["kwargs"] == {
            "cwd": temp_workspace,
            "stdout": asyncio.subprocess.PIPE,
            "stderr": asyncio.subprocess.PIPE,
        }

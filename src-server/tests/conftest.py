from pathlib import Path

import pytest


@pytest.fixture
def temp_workspace(tmp_path: Path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    yield workspace

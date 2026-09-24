from contextlib import asynccontextmanager
from pathlib import Path as StdPath
from types import SimpleNamespace
from unittest.mock import call

import pytest
from anyio import Path
from dais_sdk.types import ToolMessage

from src.agent.task.tool_call_manager.tool_result_truncator import ToolResultTruncator
from src.schemas.tasks import TaskType
from src.services.tasks import TaskResourceService


@pytest.fixture
def resource_service(mocker):
    @asynccontextmanager
    async def fake_db_context():
        yield object()

    service = mocker.Mock(spec=TaskResourceService)
    service.save_task_resource = mocker.AsyncMock()
    service.load_task_resource = mocker.AsyncMock()
    mocker.patch(
        "src.agent.task.tool_call_manager.tool_result_truncator.db_context",
        fake_db_context,
    )
    mocker.patch(
        "src.agent.task.tool_call_manager.tool_result_truncator.TaskResourceService.from_db_session",
        return_value=service,
    )
    return service


@pytest.mark.asyncio
async def test_truncate_string_result(resource_service, tmp_path: StdPath):
    original = "x" * (ToolResultTruncator.TOOL_RESULT_CHAR_LIMIT + 1)
    message = ToolMessage(
        call_id="call-1",
        name="tool",
        arguments={},
        result=original,
        metadata={"user_approval": "approved"},
    )
    saved_path = Path(tmp_path / "saved-output.txt")
    resource_service.save_task_resource.return_value = SimpleNamespace(id=7)
    resource_service.load_task_resource.return_value = saved_path

    await ToolResultTruncator(42, TaskType.TASK).truncate(message)

    resource_service.save_task_resource.assert_awaited_once_with(
        42, "tool-output_call-1.txt", original.encode("utf-8")
    )
    resource_service.load_task_resource.assert_awaited_once_with(42, 7)
    marker = ToolResultTruncator._create_truncated_marker(str(saved_path))
    assert message.result == original[:40000 - len(marker)] + marker
    assert len(message.result) == ToolResultTruncator.TOOL_RESULT_CHAR_LIMIT
    assert message.metadata == {
        "user_approval": "approved",
        "original_result": original,
    }


@pytest.mark.asyncio
async def test_truncate_content_block_result(resource_service, tmp_path: StdPath):
    first_text = "a" * 20000
    second_text = "b" * 21000
    message = ToolMessage(
        call_id="call-2",
        name="tool",
        arguments={},
        result=[
            {"resource_id": "text-1", "text": first_text},
            {"resource_id": "image-1", "type": "image", "url": "https://example.com/image.png"},
            {"resource_id": "text-2", "text": second_text},
        ],
    )
    assert message.result is not None
    original = message.result
    first_path = Path(tmp_path / "first.txt")
    second_path = Path(tmp_path / "second.txt")
    resource_service.save_task_resource.side_effect = [
        SimpleNamespace(id=8),
        SimpleNamespace(id=9),
    ]
    resource_service.load_task_resource.side_effect = [first_path, second_path]

    await ToolResultTruncator(42, TaskType.TASK).truncate(message)

    assert resource_service.save_task_resource.await_args_list == [
        call(42, "tool-output_call-2_0.txt", first_text.encode("utf-8")),
        call(42, "tool-output_call-2_2.txt", second_text.encode("utf-8")),
    ]
    assert resource_service.load_task_resource.await_args_list == [
        call(42, 8),
        call(42, 9),
    ]
    assert message.metadata["original_result"] is original

    assert message.result[0] == original[0]
    assert message.result[1] == original[1]
    marker = ToolResultTruncator._create_truncated_marker(str(second_path))
    assert message.result[2] == {
        "resource_id": "text-2",
        "text": second_text[:20000 - len(marker)] + marker,
    }
    assert original[2]["text"] == second_text

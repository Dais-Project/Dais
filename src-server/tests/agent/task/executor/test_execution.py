from unittest.mock import MagicMock

import pytest

from src.agent.task.executor.execution import AgentTaskExecution
from src.agent.types.stream import TaskDoneEvent
from src.schemas.tasks.runtime import TaskRuntimeContext, TaskType


@pytest.mark.parametrize("after_revision", [None, 1])
async def test_late_subscription_receives_terminal_event(after_revision):
    task = MagicMock()
    task.snapshot.return_value = TaskRuntimeContext(
        id=1, type=TaskType.TASK,
        usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "max_tokens": 0},
        agent_id=1, workspace_id=1, messages=[],
    )
    execution = AgentTaskExecution(task, MagicMock())
    execution._runner = MagicMock()
    execution._runner.done.return_value = True
    execution._yield_event(TaskDoneEvent())

    subscription = execution.subscribe(after_revision)
    assert isinstance((await subscription.__anext__()).event, TaskDoneEvent)
    with pytest.raises(StopAsyncIteration):
        await subscription.__anext__()
    subscription.unsubscribe()

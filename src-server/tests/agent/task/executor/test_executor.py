import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.agent.task.executor import AgentTaskExecutor
from src.agent.task.runtime_manager import AgentTaskRuntimeKey, AgentTaskRuntimeRef
from src.schemas.tasks.runtime import TaskType


@pytest.fixture
def executor(mocker):
    manager = mocker.patch("src.agent.task.executor.use_agent_task_runtime_manager").return_value
    manager.acquire = AsyncMock()
    executions = []

    def create_execution(task, on_finish):
        execution = MagicMock()
        execution.stop = AsyncMock()
        execution.subscribe.return_value = MagicMock()
        executions.append((execution, on_finish))
        return execution

    mocker.patch("src.agent.task.executor.AgentTaskExecution", side_effect=create_execution)
    notify = AsyncMock()
    return AgentTaskExecutor(notify), manager, executions, notify


@pytest.mark.parametrize("task_type", list(TaskType))
async def test_subscribe_all_types_and_release(executor, task_type):
    pool, manager, executions, notify = executor
    ref = AgentTaskRuntimeRef(task_type, 42, agent_id=9)
    subscription = await pool.get_or_subscribe(ref)

    assert subscription is executions[0][0].subscribe.return_value
    manager.acquire.assert_awaited_once_with(ref)
    executions[0][0].start.assert_called_once()
    assert notify.await_args.args[0].task_type == task_type
    assert notify.await_args.args[0].task_id == 42
    assert await pool.get_task_ids() == ([42] if task_type == TaskType.TASK else [])

    await executions[0][1]()
    manager.acquire.return_value.release.assert_awaited_once()
    assert await pool.get_checkpoint(AgentTaskRuntimeKey(task_type, 42)) is None
    assert notify.await_count == 2


async def test_same_id_different_types_and_existing_configuration(executor):
    pool, manager, executions, _ = executor
    refs = [AgentTaskRuntimeRef(task_type, 4, 1) for task_type in TaskType]
    await asyncio.gather(*(pool.get_or_subscribe(ref) for ref in refs))
    assert manager.acquire.await_count == 3
    assert len(executions) == 3
    await pool.get_or_subscribe(AgentTaskRuntimeRef(TaskType.SCHEDULE, 4, 999))
    assert manager.acquire.await_count == 3
    assert await pool.get_task_ids() == [4]

    for ref, (execution, _) in zip(refs, executions):
        key = AgentTaskRuntimeKey(ref.type, ref.id)
        assert await pool.get_checkpoint(key) is execution.checkpoint
        await pool.stop(key)
        execution.stop.assert_awaited_once()


async def test_background_start_and_concurrent_subscribe(executor):
    pool, manager, executions, _ = executor
    ref = AgentTaskRuntimeRef(TaskType.SCHEDULE, 5, 7)
    await asyncio.gather(pool.start(ref), pool.get_or_subscribe(ref))
    await pool.start(AgentTaskRuntimeRef(TaskType.SCHEDULE, 5, 999))
    manager.acquire.assert_awaited_once_with(ref)
    executions[0][0].start.assert_called_once()

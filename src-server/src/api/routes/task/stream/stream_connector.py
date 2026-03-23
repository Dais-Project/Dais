import asyncio
from loguru import logger
from fastapi import Request
from src.agent.task import AgentTask
from src.agent.types import (
    AgentGenerator,
    TaskDoneEvent, TaskInterruptedEvent,
    ErrorEvent
)


_logger = logger.bind(name="AgentStream")

async def agent_stream(task: AgentTask, request: Request) -> AgentGenerator:
    pending_terminal_event = None
    try:
        async for event in task.run():
            if await request.is_disconnected():
                await task.stop()
                break

            if isinstance(event, (TaskDoneEvent, TaskInterruptedEvent)):
                pending_terminal_event = event
                continue
            yield event
    except asyncio.CancelledError, GeneratorExit:
        await task.stop()
        raise
    except Exception as e:
        _logger.exception("Error in agent stream")
        yield ErrorEvent(error=str(e))
    finally:
        try:
            # ensure task is persisted before yielding terminal event
            await asyncio.shield(task.persist())
        except Exception as e:
            _logger.exception("Failed to persist task state in stream finalization")

    if await request.is_disconnected():
        return

    if pending_terminal_event is None:
        _logger.warning("No terminal event yielded")
        pending_terminal_event = TaskDoneEvent()
    yield pending_terminal_event

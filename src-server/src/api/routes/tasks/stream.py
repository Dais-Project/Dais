from fastapi import APIRouter
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel

from src.agent.types import AgentEvent
from src.schemas.tasks import runtime as task_runtime_schemas

from .runtime import create_agent_task
from ...dependencies import AgentTaskExecutorDep


class TaskStreamBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int


class ContinueTaskBody(TaskStreamBody): ...


# --- --- --- --- --- ---

task_stream_router = APIRouter(tags=["task", "stream"])


@task_stream_router.post(
    "/{task_type}/{task_id}/continue",
    responses={200: {"model": AgentEvent}},
    response_class=EventSourceResponse,
)
async def continue_task(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: ContinueTaskBody,
    executor: AgentTaskExecutorDep,
):
    task = await create_agent_task(task_type, task_id, body.agent_id)
    execution = await executor.get_or_append(task)
    subscription = execution.subscribe()
    execution.start()

    try:
        async for event in subscription:
            yield event
    finally:
        subscription.unsubscribe()

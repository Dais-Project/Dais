from fastapi import APIRouter
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel

from src.agent.types import AgentEvent
from src.agent.task.runtime_manager import AgentTaskRuntimeRef
from src.schemas.tasks import runtime as task_runtime_schemas

from ...dependencies import AgentTaskExecutorDep


class ContinueTaskBody(BaseModel):
    # to ensure that the agent_id for the target task is not None
    agent_id: int

task_stream_router = APIRouter(tags=["task"])

@task_stream_router.get("/runnings", response_model=list[int])
async def get_running_tasks(executor: AgentTaskExecutorDep):
    return await executor.get_task_ids()

@task_stream_router.post(
    "/{task_type}/{task_id}/continue",
    tags=["stream"],
    responses={200: {"model": AgentEvent}},
    response_class=EventSourceResponse,
)
async def continue_task(
    task_type: task_runtime_schemas.TaskType,
    task_id: int,
    body: ContinueTaskBody,
    executor: AgentTaskExecutorDep,
):
    task_ref = AgentTaskRuntimeRef(task_type, task_id, body.agent_id)
    execution = await executor.get_or_append(task_ref)
    subscription = execution.subscribe()

    try:
        await execution.start()
        async for event in subscription:
            yield event
    finally:
        subscription.unsubscribe()

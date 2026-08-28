from typing import Annotated

from fastapi import Depends, Request

from src.agent.task.executor import AgentTaskExecutor


def get_agent_task_executor(request: Request) -> AgentTaskExecutor:
    return request.state.agent_task_executor


AgentTaskExecutorDep = Annotated[
    AgentTaskExecutor,
    Depends(get_agent_task_executor),
]

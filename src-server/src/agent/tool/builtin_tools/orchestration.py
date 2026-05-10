import json
import xml.etree.ElementTree as ET
from typing import Annotated, Literal, override
from dais_sdk.types import UserMessage
from pydantic import BaseModel
from src.db import db_context
from src.services.tasks import SubtaskService
from src.db.models import tasks as tasks_models
from src.schemas.tasks import subtask as subtask_schemas
from src.schemas.tasks import runtime as task_runtime_schemas
from ..toolset_wrapper import built_in_tool, BuiltInToolset
from ...task import AgentTask
from ...types import TaskError, TaskInterrupted, TaskWaitingAction, TaskFinished
from ...context import AgentContext


class SubtaskToolAnswer(BaseModel):
    answer: str
    call_id: str

class SubtaskToolApprove(BaseModel):
    status: Literal["approved", "denied"]
    call_id: str

class NewSubtask(BaseModel):
    instruction: Annotated[str, "The initial instruction used to create a new subtask."]
    agent_id: int

class ContinueSubtask(BaseModel):
    subtask_id: int
    agent_id: Annotated[int | None,
                        """
                        The id of target agent to execute the subtask.
                        Sometimes the selected agent may be deleted, can use this parameter to pass a new agent_id.
                        """] = None
    message: str | list[SubtaskToolAnswer | SubtaskToolApprove]

async def create_agent_task_from_subtask(subtask: tasks_models.Subtask) -> AgentTask:
    task_runtime = task_runtime_schemas.TaskRuntimeContext.from_subtask(subtask)
    ctx = await AgentContext.create(task_runtime)
    return AgentTask(ctx)

class OrchestrationToolset(BuiltInToolset):
    @property
    @override
    def name(self) -> str: return "Orchestration"

    @built_in_tool(validate=True)
    async def subtask(self, action: NewSubtask | ContinueSubtask) -> str:
        """
        Create a new subtask or continue an existing subtask.

        When to use:
            - To delegate a self-contained unit of work to a subagent
            - To follow up on a completed subtask (e.g. ask for clarification or additional details)
            - To respond to a pending tool call from a running subtask (e.g. answering ask_user, approving or denying tool calls)

        Returns:
            An XML string describing the current subtask result.

            Example:
                <subtask_result subtask_id="1">
                    # Title <!-- markdown text -->
                    some content
                    <tool_call call_id="xxx" name="ask_user">Some question</tool_call>
                    <tool_call call_id="xxx" name="shell">rm -rf ./directory</tool_call>
                    <error>error messages</error>
                </subtask_result>

            Tool calls inside the result may require either:
            - A follow-up answer matched by call_id
            - An approval decision matched by call_id
        """
        async def resolve_continue_subtask(task: AgentTask, continue_message: str | list[SubtaskToolAnswer | SubtaskToolApprove]):
            if isinstance(continue_message, str):
                task.messages.append(UserMessage(content=continue_message))
                return
            for message in continue_message:
                match message:
                    case SubtaskToolAnswer(call_id=call_id, answer=answer):
                        task.tool_calls.apply_user_response(call_id, answer)
                    case SubtaskToolApprove(call_id=call_id, status=status):
                        task.tool_calls.approve(call_id, status == "approved")

        def serialize_subtask_result(task_result: TaskError | TaskInterrupted | TaskWaitingAction | TaskFinished) -> str:
            root = ET.Element("subtask_result", {"subtask_id": str(subtask.id)})

            match task_result:
                case TaskFinished(summary=summary):
                    root.text = summary
                case TaskWaitingAction(messages=messages):
                    for message in messages:
                        tool_call_elem = ET.SubElement(root, "tool_call", {
                            "call_id": message.call_id,
                            "name": message.name,
                        })
                        tool_call_elem.text = json.dumps(message.arguments, ensure_ascii=False)
                case TaskError(event=event):
                    ET.SubElement(root, "error").text = event.error
                case TaskInterrupted():
                    ET.SubElement(root, "status").text = "interrupted"

            return ET.tostring(root, encoding="unicode")

        async with db_context() as db_session:
            subtask_service = SubtaskService(db_session)
            match action:
                case NewSubtask(instruction=instruction, agent_id=agent_id):
                    subtask = await subtask_service.create_subtask(subtask_schemas.SubtaskCreate(
                        instruction=instruction,
                        task_id=self._ctx.task_id,
                        agent_id=agent_id,
                    ))
                    task = await create_agent_task_from_subtask(subtask)
                case ContinueSubtask(subtask_id=subtask_id, agent_id=agent_id, message=message):
                    subtask = await subtask_service.get_subtask_by_id(subtask_id)
                    if agent_id is not None: subtask.agent_id = agent_id
                    task = await create_agent_task_from_subtask(subtask)
                    await resolve_continue_subtask(task, message)

        if subtask.agent_id is None:
            raise ValueError("The agent_id of this subtask is null, please pass a new agent_id when continuing this subtask.")

        task_result = await task.run_until_done()
        return serialize_subtask_result(task_result)

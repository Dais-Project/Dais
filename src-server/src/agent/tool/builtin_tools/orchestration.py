import asyncio
import json
import xml.etree.ElementTree as ET
from typing import TYPE_CHECKING, Annotated, Literal, override

from anyxml import AnyXml
from dais_sdk.types import UserMessage
from pydantic import BaseModel

from src.db import db_context
from src.db.models import tasks as tasks_models
from src.schemas.tasks import runtime as task_runtime_schemas
from src.schemas.tasks import subtask as subtask_schemas
from src.services.tasks import SubtaskService

from ..toolset_wrapper import BuiltinToolset, builtin_tool
from ...types import (
    TaskError,
    TaskFinished,
    TaskInterrupted,
    TaskWaitingAction,
    TaskStopResult,
    is_agent_tool_metadata,
)


if TYPE_CHECKING:
    from ...task import AgentTask


class SubtaskToolRespond(BaseModel):
    answer: Annotated[str,
                      "The answer to provide for a response-pending tool call."]
    call_id: Annotated[str,
                       "The call_id of the pending tool call, as returned in the subtask result."]

class SubtaskToolApprove(BaseModel):
    decision: Annotated[Literal["approved", "denied"],
                        "Whether to approve or deny the pending tool call."]
    call_id: Annotated[str,
                       "The call_id of the pending tool call, as returned in the subtask result."]

async def create_agent_task_from_subtask(subtask: tasks_models.Subtask) -> AgentTask:
    from ...context import AgentContext
    from ...task import AgentTask

    task_runtime = task_runtime_schemas.TaskRuntimeContext.from_subtask(subtask)
    ctx = await AgentContext.create(task_runtime)
    return AgentTask(ctx)

def compose_subtask_result(subtask: AgentTask, task_result: TaskStopResult) -> str:
    root = ET.Element("subtask_result", {"subtask_id": str(subtask.id)})
    match task_result:
        case TaskFinished(summary=summary, detail=detail):
            root.attrib["status"] = "finished"
            if detail is None:
                root.text = AnyXml.RawText(summary)
            else:
                detail_elem = ET.SubElement(root, "detail")
                detail_elem.text = AnyXml.RawText(detail)
                summary_elem = ET.SubElement(root, "summary")
                summary_elem.text = AnyXml.RawText(summary)
        case TaskWaitingAction(messages=messages):
            root.attrib["status"] = "waiting_action"
            for message in messages:
                assert is_agent_tool_metadata(message.metadata)
                tool_call_elem = ET.SubElement(
                    root,
                    "tool_call",
                    {
                        "call_id": message.call_id,
                        "name": message.name,
                    },
                )
                if pending_action := message.metadata.get("pending_action"):
                    tool_call_elem.attrib["pending_action"] = pending_action
                tool_call_elem.text = AnyXml.RawText(
                    json.dumps(message.arguments, ensure_ascii=False)
                )
        case TaskError(event=event):
            root.attrib["status"] = "error"
            root.text = AnyXml.RawText(event.error)
        case TaskInterrupted():
            root.attrib["status"] = "interrupted"

    if todos := subtask.todos:
        progress_elem = ET.SubElement(root, "progress")
        for todo in todos:
            step_elem = ET.SubElement(
                progress_elem,
                "step",
                {"status": todo.status},
            )
            step_elem.text = AnyXml.RawText(todo.description)

    return AnyXml.tostring(root)

async def run_subtask(task: AgentTask) -> str:
    try:
        await task.persist()
        task_result = await task.run_until_done()
        return compose_subtask_result(task, task_result)
    except asyncio.CancelledError:
        await task.stop()
        raise
    finally:
        await asyncio.shield(task.persist())

class OrchestrationToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "Orchestration"

    @builtin_tool(validate=True)
    async def create_subtask(
        self,
        agent_id: Annotated[int,
                            "The ID of the target agent to execute the subtask."],
        instruction: Annotated[str,
                               "The initial instruction used to create the new subtask."],
    ) -> str:
        """
        Create and run a new subtask.

        When to use:
            - To delegate a self-contained unit of work to a specialized agent
            - To isolate investigative or exploratory work whose intermediate steps would otherwise accumulate in the main context
            - To run independent work in parallel when the tasks do not depend on each other

        Parallel usage:
            - Use 1 subtask when the goal is narrow and the context is clear
            - Use multiple subtasks only for independent units of work
            - Use 5 subtasks maximum and prefer the minimum number necessary

        Consuming results:
            Once a subtask has investigated something, treat its findings as authoritative and do not re-investigate the same question inline.

        Returns:
            An XML string describing the subtask result.
            The root element has `subtask_id` and `status` attributes.
            The status can be "finished", "waiting_action", "error", or "interrupted".
            When detail is present, a finished result contains separate `<detail>` and `<summary>` elements. Without detail, the summary remains directly in the root element.
        """
        async with db_context() as db_session:
            subtask = await SubtaskService.from_db_session(db_session).create(
                subtask_schemas.SubtaskCreate(
                    instruction=instruction,
                    task_id=self._ctx.task_id,
                    agent_id=agent_id,
                )
            )
            task = await create_agent_task_from_subtask(subtask)

        return await run_subtask(task)

    @builtin_tool(validate=True)
    async def followup_subtask(
        self,
        subtask_id: Annotated[int,
                              "The ID of the subtask to continue, as returned in the subtask result."],
        message: Annotated[str | list[SubtaskToolRespond | SubtaskToolApprove],
                           """
                           Either:
                           - A follow-up instruction when the subtask status is 'finished'
                           - Responses to pending tool calls when status is 'waiting_action'.
                               For each <tool_call> in the subtask result, pick the response type by pending_action:
                               - pending_action="respond" → SubtaskToolRespond (provide a text answer)
                               - pending_action="approve" → SubtaskToolApprove (approve or deny execution)
                           Match each response to its tool call via call_id.
                           """],
        agent_id: Annotated[int | None,
                            """
                            The ID of the target agent to execute the subtask.
                            If the previously selected agent was deleted, pass a replacement agent_id.
                            """] = None,
    ) -> str:
        """
        Continue an existing subtask.

        When to use:
            - To send a follow-up instruction to a completed subtask
            - To answer a response-pending tool call from a subtask
            - To approve or deny an approval-pending tool call from a subtask
            - To retry a subtask that returned an error while preserving its context

        Constraints:
            - Never continue the same subtask in parallel; calls targeting the same subtask_id must be sequential
            - If the same subtask fails 3 consecutive times, stop retrying it and create a replacement subtask

        Returns:
            An XML string describing the updated subtask result.
            The root element has `subtask_id` and `status` attributes.
            The status can be "finished", "waiting_action", "error", or "interrupted".
            When detail is present, a finished result contains separate `<detail>` and `<summary>` elements. Without detail, the summary remains directly in the root element.
        """
        async with db_context() as db_session:
            subtask = await SubtaskService.from_db_session(db_session).get_by_id(subtask_id)
            if agent_id is not None:
                subtask.agent_id = agent_id
            if subtask.agent_id is None:
                raise ValueError(
                    "The agent_id of this subtask is null, please pass a new agent_id "
                    "when following up on this subtask."
                )
            task = await create_agent_task_from_subtask(subtask)

        if isinstance(message, str):
            task.tool_calls.discard_pendings()
            task.messages.append(UserMessage(content=message))
        else:
            for response in message:
                match response:
                    case SubtaskToolRespond(call_id=call_id, answer=answer):
                        task.tool_calls.apply_user_response(call_id, answer)
                    case SubtaskToolApprove(call_id=call_id, decision=decision):
                        task.tool_calls.approve(call_id, decision == "approved")

        return await run_subtask(task)

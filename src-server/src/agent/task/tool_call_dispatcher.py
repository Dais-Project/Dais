import asyncio
from dataclasses import dataclass
from collections.abc import AsyncGenerator
from typing import AsyncGenerator
from loguru import logger
from dais_sdk.tool import ToolCallExecutor
from dais_sdk.types import ToolDef, ToolMessage, ToolDoesNotExistError
from .tool_call_reviewer import ToolCallReviewer, ToolCallBlocked, ToolCallApproved
from ..context import AgentContext
from ..types import (
    ToolEvent, ToolExecutedEvent, MessageReplaceEvent, ErrorEvent,
    ToolRequirePermissionEvent,
)
from ..exception_handlers import handle_tool_does_not_exist_error
from ..tool import ExecutionControlToolset


@dataclass
class ToolCallDispatchResult:
    has_finished_task: bool
    has_blocked_tool_calls: bool

@dataclass
class ToolCallDispatch:
    message: ToolMessage
    tool: ToolDef

class ToolCallDispatcher:
    _logger = logger.bind(name="ToolCallDispatcher")

    def __init__(self, ctx: AgentContext, tool_call_executor: ToolCallExecutor, tool_call_reviewer: ToolCallReviewer):
        self._ctx = ctx
        self._tool_call_executor = tool_call_executor
        self._tool_call_reviewer = tool_call_reviewer

    async def execute(self, tool: ToolDef, message: ToolMessage) -> ToolExecutedEvent:
        """
        Execute tool call and attach the result to the corresponding message.
        This method should not throw any exceptions.
        """
        result, error = await self._tool_call_executor.execute(tool, message.arguments)
        message.result = result
        message.error = error

        return ToolExecutedEvent(
            call_id=message.call_id,
            result=result if error is None else None)

    async def _classify(self,
                        dispatches: list[ToolCallDispatch]
                        ) -> tuple[
                            list[tuple[ToolCallApproved, ToolCallDispatch]],
                            list[tuple[ToolCallBlocked, ToolCallDispatch]]
                        ]:
        approved: list[tuple[ToolCallApproved, ToolCallDispatch]] = []
        blocked: list[tuple[ToolCallBlocked, ToolCallDispatch]] = []

        for dispatch in dispatches:
            tool, message = dispatch.tool, dispatch.message
            permission_check_result =\
                await self._tool_call_reviewer.check_permission(tool, message)
            match permission_check_result:
                case ToolCallApproved() as approved_event:
                    approved.append((approved_event, dispatch))
                case ToolCallBlocked() as blocked_event:
                    blocked.append((blocked_event, dispatch))

        if len(blocked) == 0:
            return approved, blocked

        waiting_audit: list[ToolCallDispatch] = []
        remaining_blocked: list[tuple[ToolCallBlocked, ToolCallDispatch]] = []
        for blocked_event, dispatch in blocked:
            if isinstance(blocked_event.event, ToolRequirePermissionEvent):
                waiting_audit.append(dispatch)
            else:
                remaining_blocked.append((blocked_event, dispatch))

        audit_result =\
            await self._tool_call_reviewer.audit_tool_calls(waiting_audit)
        if audit_result is None:
            return approved, blocked

        high_risk, low_risk = audit_result
        approved.extend((ToolCallApproved(), dispatch) for dispatch in low_risk)
        blocked = remaining_blocked + [
            (ToolCallBlocked(ToolRequirePermissionEvent(
                call_id=dispatch.message.call_id,
                tool_name=dispatch.tool.name,
            )), dispatch)
            for dispatch in high_risk
        ]
        return approved, blocked

    async def _dispatch_stream(self,
                               tool_call_messages: list[ToolMessage],
                               result: ToolCallDispatchResult,
                               ) -> AsyncGenerator[ToolEvent
                                                 | MessageReplaceEvent
                                                 | ErrorEvent, None]:
        dispatches: list[ToolCallDispatch] = []
        for message in tool_call_messages:
            tool = self._ctx.find_tool(message.name)
            if tool is None:
                message.error = handle_tool_does_not_exist_error(ToolDoesNotExistError(message.name))
                yield MessageReplaceEvent(message=message)
                continue
            if tool.executes(ExecutionControlToolset.finish_task):
                result.has_finished_task = True
            dispatches.append(ToolCallDispatch(message=message, tool=tool))

        approved, blocked = await self._classify(dispatches)

        result.has_blocked_tool_calls = len(blocked) > 0
        for blocked_event, dispatch in blocked:
            yield blocked_event.event
            yield MessageReplaceEvent(message=dispatch.message)

        async def execute_wrapper(dispatch: ToolCallDispatch):
            executed_event = await self.execute(dispatch.tool, dispatch.message)
            return executed_event, MessageReplaceEvent(message=dispatch.message)

        execute_tasks = [execute_wrapper(dispatch) for _, dispatch in approved]
        for item in await asyncio.gather(*execute_tasks, return_exceptions=True):
            if isinstance(item, BaseException):
                self._logger.exception(f"Tool call execution error: ", exc_info=item)
                continue
            executed_event, replace_event = item
            yield executed_event
            yield replace_event

    def dispatch(self, tool_call_messages: list[ToolMessage]) -> tuple[AsyncGenerator[ToolEvent | MessageReplaceEvent | ErrorEvent, None], ToolCallDispatchResult]:
        result = ToolCallDispatchResult(
            has_finished_task=False,
            has_blocked_tool_calls=False,
        )
        return self._dispatch_stream(tool_call_messages, result), result

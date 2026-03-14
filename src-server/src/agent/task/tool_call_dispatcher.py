import asyncio
from dataclasses import dataclass
from collections.abc import AsyncGenerator
from typing import AsyncGenerator
from dais_sdk.tool import ToolCallExecutor
from loguru import logger
from dais_sdk.types import ToolDef, ToolLike, ToolMessage, ToolDoesNotExistError
from .tool_call_reviewer import ToolCallReviewer, ToolCallBlocked, ToolCallApproved
from ..context import AgentContext
from ..types import ToolEvent, ToolExecutedEvent, MessageReplaceEvent, ToolCallEndEvent, ErrorEvent
from ..exception_handlers import handle_tool_does_not_exist_error
from ..tool import ExecutionControlToolset


@dataclass
class ToolCallDispatchResult:
    has_finished_task: bool
    pendings: list[ToolMessage]

class ToolCallDispatcher:
    _logger = logger.bind(name="ToolCallDispatcher")

    def __init__(self, ctx: AgentContext, tool_call_executor: ToolCallExecutor, tool_call_reviewer: ToolCallReviewer):
        self._ctx = ctx
        self._tool_call_executor = tool_call_executor
        self._tool_call_reviewer = tool_call_reviewer

    async def execute(self, tool: ToolLike, message: ToolMessage) -> ToolEvent:
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

    async def _dispatch_stream(self,
                               tool_call_messages: list[ToolMessage],
                               result: ToolCallDispatchResult,
                               ) -> AsyncGenerator[ToolEvent
                                                 | MessageReplaceEvent
                                                 | ErrorEvent, None]:
        executables = list[tuple[ToolDef, ToolMessage]]()
        for message in tool_call_messages:
            tool: ToolLike | None = self._ctx.find_tool(message.name)
            if tool is None:
                message.error = handle_tool_does_not_exist_error(ToolDoesNotExistError(message.name))
                yield MessageReplaceEvent(message=message)
                continue

            # Since the toolsets only contain ToolDefs, and the tools are all under toolsets,
            # so we can safely assert the type of tool_def to ToolDef here.
            assert isinstance(tool, ToolDef)

            if tool.executes(ExecutionControlToolset.finish_task):
                result.has_finished_task = True

            permission_check_result = self._tool_call_reviewer.check_permission(tool, message)
            match permission_check_result:
                case ToolCallBlocked(event):
                    yield event
                    yield MessageReplaceEvent(message=message)
                    result.pendings.append(message)
                case ToolCallApproved():
                    executables.append((tool, message))

        if len(executables) > 0:
            execute_tasks = [self.execute(tool, message) for tool, message in executables]
            events = await asyncio.gather(*execute_tasks, return_exceptions=True)
            for event, (_, message) in zip(events, executables):
                if isinstance(event, BaseException):
                    self._logger.exception(f"Error in tool call {message.call_id}")
                    continue
                yield event
                yield MessageReplaceEvent(message=message)

    def dispatch(self, tool_call_messages: list[ToolMessage]) -> tuple[AsyncGenerator[ToolEvent | MessageReplaceEvent | ErrorEvent, None], ToolCallDispatchResult]:
        result = ToolCallDispatchResult(has_finished_task=False, pendings=[])
        return self._dispatch_stream(tool_call_messages, result), result

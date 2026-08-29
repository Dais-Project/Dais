import asyncio
from loguru import logger
from dais_sdk.types import ToolMessage, AssistantMessage
from src.schemas import workspace as workspace_schemas
from src.schemas.tasks import runtime as task_runtime_schemas
from .message_manager import MessageManager, MessageNotFoundError
from .tool_call_manager import ToolCallManager
from .llm_request_manager import LlmRequestManager
from ..notes import NoteWatcher
from ..context import AgentContext
from ..tool import ExecutionControlToolset
from ..tool.builtin_tools.execution_control import TodoItem
from ..types import (
    AgentGenerator,
    TaskError, TaskWaitingAction, TaskInterrupted, TaskFinished, TaskStopResult,
    TaskStartEvent, TurnEndEvent, ToolCallEndEvent, MessageEndEvent,
    TaskInterruptedEvent, TaskDoneEvent, ErrorEvent
)


class AgentTask:
    _logger = logger.bind(name="AgentTask")

    def __init__(self, ctx: AgentContext):
        self._ctx = ctx
        self._is_running = True
        self._message_manager = MessageManager(ctx)
        self._llm_request_manager = LlmRequestManager(ctx)
        self._tool_call_manager = ToolCallManager(ctx, self._message_manager)

    def _extract_tool_call(self, message: AssistantMessage) -> list[ToolMessage] | None:
        tool_call_messages = message.get_incomplete_tool_messages()
        if (message.tool_calls is None or
            tool_call_messages is None or len(tool_call_messages) == 0):
            return None
        return tool_call_messages

    async def _run_turn(self) -> AgentGenerator:
        MAX_ATTEMPT = 3
        assistant_message: AssistantMessage | None = None
        for attempt in range(MAX_ATTEMPT):
            last_chunk: MessageEndEvent | TaskInterruptedEvent | ErrorEvent | None = None
            try:
                llm_stream = self._llm_request_manager.create_llm_call()
                async for chunk in llm_stream:
                    if isinstance(chunk, self._llm_request_manager.FINISHING_CHUNK_TYPE):
                        last_chunk = chunk
                        continue
                    yield chunk
            except asyncio.CancelledError:
                # Task cancelled by user
                await self.stop()
                return

            match last_chunk:
                case MessageEndEvent() as message_end_chunk:
                    yield message_end_chunk
                    temp_message = message_end_chunk.message
                    if (temp_message.content is None and
                        temp_message.reasoning_content is None and
                       (temp_message.tool_calls is None or len(temp_message.tool_calls) == 0)):
                        # empty message, retry
                        continue
                    assistant_message = temp_message
                    break
                case ErrorEvent(error=error, retryable=retryable) as error_chunk:
                    self._logger.warning(f"LLM provider error: {error}")
                    if not retryable or attempt == MAX_ATTEMPT - 1:
                        yield error_chunk
                        await self.stop()
                        return
                    continue # retry
                case TaskInterruptedEvent() as interrupted_chunk:
                    yield interrupted_chunk
                    await self.stop()
                    return
                case _ as chunk:
                    self._logger.warning(f"Unexpected message event: {chunk}")
                    await self.stop()
                    return

        if assistant_message is None: 
            await self.stop()
            return

        self._ctx.messages.append(assistant_message)
        tool_call_messages = self._extract_tool_call(assistant_message)
        if tool_call_messages is None:
            await self.stop()
            return

        for message in tool_call_messages:
            self._ctx.messages.append(message)
            yield ToolCallEndEvent(message=message)

        dispatch_stream, dispatch_result =\
            self._tool_call_manager.dispatch(tool_call_messages)
        async for event in dispatch_stream:
            yield event
        if (dispatch_result.has_finished_task or
            dispatch_result.has_blocked_tool_calls):
            await self.stop()
            return
        await self.persist()

    @property
    def id(self) -> int:
        return self._ctx.task_id

    @property
    def type(self) -> task_runtime_schemas.TaskType:
        return self._ctx.task_type

    @property
    def messages(self) -> MessageManager:
        return self._message_manager

    @property
    def tool_calls(self) -> ToolCallManager:
        return self._tool_call_manager

    @property
    def workspace(self) -> workspace_schemas.WorkspaceRead:
        return self._ctx._resource.workspace

    async def run(self) -> AgentGenerator:
        _exited_by_generator_close = False

        async with NoteWatcher(self.workspace.id):
            try:
                yield TaskStartEvent()
                tail_tool_calls = list(self.messages.tail_tool_messages_iter())
                dispatch_stream, _ = self.tool_calls.dispatch(tail_tool_calls)
                async for event in dispatch_stream:
                    yield event
                has_pending_tool_calls = len(self.tool_calls.collect_pendings()) > 0
                if has_pending_tool_calls:
                    self._logger.debug("Pending tool calls exist; stopping task continuation.")
                    return

                while self._is_running:
                    async for event in self._run_turn():
                        yield event
                    yield TurnEndEvent()
            except GeneratorExit:
                _exited_by_generator_close = True
            finally:
                if not _exited_by_generator_close:
                    yield TaskDoneEvent()

    async def run_until_done(self) -> TaskStopResult:
        async for event in self.run():
            if isinstance(event, ErrorEvent):
                return TaskError(event=event)
            if isinstance(event, TaskInterruptedEvent):
                return TaskInterrupted()

        pending_tool_calls = self._tool_call_manager.collect_pendings()
        if len(pending_tool_calls) > 0:
            return TaskWaitingAction(messages=pending_tool_calls)

        last_message = self.messages[-1]
        if last_message.role == "assistant" and last_message.content is not None:
            return TaskFinished(summary=last_message.content)
        if (last_message.role == "tool" and
           (tool := self._ctx.find_tool(last_message.name)) and
           tool.executes(ExecutionControlToolset.finish_task)):
            previous_message = self.messages[-2]
            detail = (
                previous_message.content
                if previous_message.role == "assistant"
                else None
            )
            return TaskFinished(
                summary=last_message.arguments["summary"],
                detail=detail,
            )
        return TaskInterrupted()

    @property
    def todos(self) -> list[TodoItem] | None:
        for message in reversed(self._ctx.messages):
            if message.role != "tool": continue

            tool = self._ctx.find_tool(message.name)
            if tool is not None and tool.executes(ExecutionControlToolset.update_todos):
                try:
                    todos_raw = message.arguments["todos"]
                    return [TodoItem(
                        description=t["description"],
                        status=t["status"]
                    ) for t in todos_raw]
                except KeyError: return None
        return None

    def snapshot(self) -> task_runtime_schemas.TaskRuntimeContext:
        return task_runtime_schemas.TaskRuntimeContext(
            id=self._ctx.task_id,
            type=self._ctx.task_type,
            usage=self._ctx.usage,
            agent_id=self._ctx._resource.agent.id,
            workspace_id=self._ctx._resource.workspace.id,
            messages=self._ctx.messages,
        ).model_copy(deep=True)

    async def persist(self) -> task_runtime_schemas.TaskRuntimeContext:
        return await self._ctx.persist()

    async def stop(self):
        self._is_running = False
        await self._llm_request_manager.cancel()

__all__ = [
    "AgentTask",
    "MessageNotFoundError",
]

import asyncio
import queue
import threading
import time
import uuid
from collections.abc import Generator
from typing import Literal, cast
from loguru import logger
from dais_sdk import (
    execute_tool_sync,
    LLM, AssistantMessage, LlmRequestParams,
    SystemMessage, ToolMessage, UserMessage, ToolDef
)
from .context import AgentContext
from .tool import finish_task, ask_user
from .tool.types import is_tool_metadata
from .prompts import USER_IGNORED_TOOL_CALL_RESULT, USER_DENIED_TOOL_CALL_RESULT
from .types import (
    AgentEvent, ToolEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    MessageReplaceEvent, ToolCallEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent,
    ToolRequirePermissionEvent, ToolRequireUserResponseEvent,
    ErrorEvent,
    UserApprovalStatus, is_agent_metadata
)
from ..services.task import TaskService
from ..db.models import task as task_models
from ..db.schemas import task as task_schemas
from ..utils import use_async_task_pool, TaskNotFoundError as AsyncTaskNotFoundError

LlmChunkQueue = queue.Queue[MessageChunkEvent
                          | MessageStartEvent
                          | MessageEndEvent
                          | ToolCallEndEvent
                          | TaskInterruptedEvent
                          | ErrorEvent]

def tool_execute_wrapper(tool_def: ToolDef, arguments: str) -> tuple[str | None, str | None]:
    """
    Returns:
        A tuple of (result, error)
    """
    result, error = None, None
    try:
        result = execute_tool_sync(tool_def, arguments)
    except Exception as e:
        error = f"{type(e).__name__}: {str(e)}"
    return result, error

# --- --- --- --- --- ---

class ToolCallNotFoundError(Exception):
    tool_call_id: str

class AgentTask:
    _logger = logger.bind(name="AgentTask")

    def __init__(self, task: task_models.Task):
        self._lock = threading.Lock()
        assert task.agent_id is not None
        ctx = self._ctx = AgentContext(task)
        self.llm = LLM(
            provider=ctx.provider.type,
            base_url=ctx.provider.base_url,
            api_key=ctx.provider.api_key)
        self.task_id = task.id
        self.model_id = ctx.model.name
        self._is_running = True
        self._current_task_id = None
        self._messages = task.messages
        self._request_params = self._request_param_factory()

    def _request_param_factory(self) -> LlmRequestParams:
        return LlmRequestParams(
            model=self.model_id,
            messages=[
                SystemMessage(content=self._ctx.system_instruction),
                *self._messages,
            ],
            tools=[ask_user, finish_task],
            toolsets=self._ctx.toolsets,
            tool_choice="required")

    async def _create_llm_call(self, chunk_queue: LlmChunkQueue) -> ToolMessage | None:
        """
        Create LLM API call, put message chunks into chunk_queue and return the first tool call message
        """
        assistant_message_id = str(uuid.uuid4())
        assistant_message: AssistantMessage | None = None
        try:
            stream, message_queue = await self.llm.stream_text(self._request_params)
            chunk_queue.put_nowait(MessageStartEvent(message_id=assistant_message_id))
            async for chunk in stream:
                chunk_queue.put_nowait(MessageChunkEvent(chunk))

            # Since we did not set `execute_tools` flag,
            # there will be only one assistant message in the queue
            first_message = await message_queue.get()
            assert type(first_message) == AssistantMessage
            assistant_message = first_message
            assistant_message.id = assistant_message_id
            chunk_queue.put_nowait(MessageEndEvent())
        except asyncio.CancelledError:
            chunk_queue.put_nowait(TaskInterruptedEvent())
            raise
        except Exception as e:
            self._logger.exception(f"Failed to create llm call.")
            chunk_queue.put_nowait(ErrorEvent(error=e))

        if assistant_message is None:
            return None

        with self._lock:
            self._messages.append(assistant_message)

        if not assistant_message.tool_calls or len(assistant_message.tool_calls) == 0:
            return None

        # Only keep the first tool call
        assistant_message.tool_calls = assistant_message.tool_calls[:1]
        partial_tool_messages = assistant_message.get_incomplete_tool_messages()
        if partial_tool_messages is None or len(partial_tool_messages) == 0:
            return None

        tool_call_message = partial_tool_messages[0]

        with self._lock:
            self._messages.append(tool_call_message)
        return tool_call_message

    def _consume_chunk_queue(self, chunk_queue: LlmChunkQueue) -> Generator[AgentEvent]:
        while self._is_running:
            try:
                chunk = chunk_queue.get(timeout=0.3)
            except queue.Empty:
                continue

            yield chunk
            if isinstance(chunk, (MessageEndEvent, TaskInterruptedEvent, ErrorEvent)):
                break

    def _handle_tool_call(self, tool_call_message: ToolMessage) -> Generator[AgentEvent, None, bool]:
        """
        Handle tool call and yield events

        Returns:
            bool: True if the task should be interrupted, False otherwise
        """
        if not (tool_event := self._process_tool_call_to_event(tool_call_message)):
            return False

        yield tool_event
        if isinstance(tool_event, ToolRequirePermissionEvent):
            yield MessageReplaceEvent(message=tool_call_message)

        if isinstance(tool_event, (ToolRequirePermissionEvent, ToolRequireUserResponseEvent)):
            return True

        return False

    def _process_tool_call_to_event(self, message: ToolMessage) -> ToolEvent | None:
        """Process tool call and convert to event"""
        tool_def = self._request_params.find_tool(message.name)
        metadata = message.metadata

        if tool_def is None:
            self._logger.warning(f"Tool call '{message.tool_call_id}' has no tool definition")
            return None

        if tool_def in [ask_user, finish_task]:
            return ToolRequireUserResponseEvent(
                tool_name=cast(Literal["ask_user", "finish_task"], message.name))

        # Since the toolsets only contain ToolDefs,
        # the tools are all under toolsets except for `ask_user` and `finish_task`,
        # so we can safely assert the type of tool_def to ToolDef here.
        assert isinstance(tool_def, ToolDef)

        # use TypeGuards to assert the type of metadata
        assert is_tool_metadata(tool_def.metadata)
        assert is_agent_metadata(metadata)

        if "user_approval" not in metadata:
            metadata["user_approval"] = UserApprovalStatus.PENDING

        if tool_def.metadata["auto_approve"] == False:
            match metadata["user_approval"]:
                case UserApprovalStatus.PENDING:
                    return ToolRequirePermissionEvent(tool_call_id=message.tool_call_id)
                case UserApprovalStatus.DENIED:
                    message.result = USER_DENIED_TOOL_CALL_RESULT
                    return None
                case UserApprovalStatus.APPROVED:
                    # continue to execute
                    pass

        result, error = tool_execute_wrapper(tool_def, message.arguments)
        message.result = result
        message.error = error

        return ToolExecutedEvent(
            tool_call_id=message.tool_call_id,
            result=result if error is None else None)

    @property
    def is_running(self) -> bool:
        return self._is_running

    def append_message(self, message: UserMessage):
        try:
            last_message = self._messages[-1]
        except IndexError:
            last_message = None

        if last_message and\
           last_message.role == "tool" and\
           last_message.result is None and \
           last_message.error is None:
            # If the previous tool call is not finished,
            # we consider it as ignored by user.
            last_message.result = USER_IGNORED_TOOL_CALL_RESULT
            last_message.metadata.clear()

        self._messages.append(message)

    def set_tool_call_result(self, tool_call_id: str, result: str) -> ToolMessage:
        """
        Set the result for a tool call

        Raises:
            ToolCallNotFoundError
        """
        for message in reversed(self._messages):
            if (message.role         == "tool" and
                message.tool_call_id == tool_call_id):
                message.result = result
                return message
        raise ToolCallNotFoundError(tool_call_id)

    def approve_tool_call(
        self, tool_call_id: str, approved: bool
    ) -> tuple[ToolEvent | None, MessageReplaceEvent | None]:
        """
        Approve or deny a tool call

        Returns:
            A tuple of (ToolEvent, MessageReplaceEvent)
            - ToolEvent: The tool execution event (if any)
            - MessageReplaceEvent: The message replace event for frontend sync

        Raises:
            ToolCallNotFoundError
        """
        target_message = None
        for message in reversed(self._messages):
            if message.role == "tool" and message.tool_call_id == tool_call_id:
                target_message = message
                break
        if target_message is None:
            raise ToolCallNotFoundError(tool_call_id)

        metadata = target_message.metadata
        assert is_agent_metadata(metadata)
        if "user_approval" not in metadata:
            # This should not happen, but we handle it just in case.
            self._logger.warning(f"Tool call {tool_call_id} has no user_approval metadata")
            metadata["user_approval"] = UserApprovalStatus.PENDING

        if metadata["user_approval"] != UserApprovalStatus.PENDING:
            # The tool call has been approved or denied before.
            return None, None
        metadata["user_approval"] = (UserApprovalStatus.APPROVED
                                     if approved
                                     else UserApprovalStatus.DENIED)

        tool_event = self._process_tool_call_to_event(target_message)
        replace_event = MessageReplaceEvent(message=target_message)
        return tool_event, replace_event

    def run(self) -> Generator[AgentEvent]:
        """
        Run agent task and generate event stream

        Yields:
            AgentEvent: Various events during task execution
        """
        async_task_pool = use_async_task_pool()

        try:
            while self._is_running:
                chunk_queue = LlmChunkQueue()
                self._current_task_id = async_task_pool.add_task(
                                        self._create_llm_call(chunk_queue))

                yield from self._consume_chunk_queue(chunk_queue)

                try:
                    tool_call_message = async_task_pool.wait_result(self._current_task_id)
                except AsyncTaskNotFoundError:
                    # Task cancelled by user
                    break

                if tool_call_message is None:
                    # Exception occurred during LLM call
                    break

                yield ToolCallEndEvent(message=tool_call_message)

                should_interrupt = yield from self._handle_tool_call(tool_call_message)
                if should_interrupt: break
        finally:
            # ensure TaskDoneEvent is yielded
            yield TaskDoneEvent()

    def persist(self):
        with TaskService() as task_service:
            task_service.update_task(self.task_id, task_schemas.TaskUpdate(
                messages=self._messages,
                last_run_at=int(time.time())
            ))

    def stop(self):
        with self._lock:
            self._is_running = False
            if self._current_task_id:
                async_task_pool = use_async_task_pool()
                async_task_pool.cancel(self._current_task_id)

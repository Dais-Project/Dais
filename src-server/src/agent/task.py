import asyncio
import queue
import threading
from collections.abc import Generator
import time
from typing import Literal, cast
from loguru import logger
from liteai_sdk import LLM, AssistantMessage, LlmRequestParams, MessageChunk,\
                       SystemMessage, ToolMessage, UserMessage, execute_tool_sync
from .context import AgentContext
from .builtin_tools import finish_task, ask_user, FileSystemToolset
from .types import (
    AgentEvent,
    MessageChunkEvent, MessageStartEvent, MessageEndEvent,
    TaskDoneEvent, TaskInterruptedEvent,
    ToolExecutedEvent,
    ToolRequirePermissionEvent, ToolRequireUserResponseEvent,
    ErrorEvent
)
from ..services.task import TaskService
from ..db.models import task as task_models
from ..db.schemas import task as task_schemas
from ..utils import use_async_task_pool, TaskNotFoundError as AsyncTaskNotFoundError

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

    def __del__(self):
        self.stop()
        self.persist()

    def _request_param_factory(self) -> LlmRequestParams:
        return LlmRequestParams(
            model=self.model_id,
            messages=[
                SystemMessage(content=self._ctx.system_instruction),
                *self._messages,
            ],
            tools=[ask_user, finish_task],
            toolsets=self._ctx.toolsets,
            tool_choice="required",
        )

    async def _create_llm_call(self,
                chunk_queue: queue.Queue[MessageChunkEvent
                                       | MessageStartEvent
                                       | MessageEndEvent
                                       | TaskInterruptedEvent
                                       | ErrorEvent]
                ) -> ToolMessage | None:
        """
        Create LLM API call, put message chunks into chunk_queue and return the first tool call message
        """
        assistant_message: AssistantMessage | None = None
        try:
            stream, message_queue = await self.llm.stream_text(self._request_param_factory())
            chunk_queue.put_nowait(MessageStartEvent())
            async for chunk in stream:
                chunk_queue.put_nowait(MessageChunkEvent(chunk))

            # Since we did not set `execute_tools` flag,
            # there will be only one assistant message in the queue
            first_message = await message_queue.get()
            assert type(first_message) == AssistantMessage
            assistant_message = first_message
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
        partial_tool_messages = assistant_message.get_partial_tool_messages()
        if partial_tool_messages is None or len(partial_tool_messages) == 0:
            return None

        tool_call_message = partial_tool_messages[0]
        with self._lock:
            self._messages.append(tool_call_message)
        return tool_call_message

    def _process_tool_call_to_event(self,
            tool_call_message: ToolMessage
            ) -> ToolExecutedEvent\
               | ToolRequireUserResponseEvent\
               | ToolRequirePermissionEvent | None:
        """Process tool call and convert to event"""
        if tool_call_message.tool_def in [ask_user, finish_task]:
            return ToolRequireUserResponseEvent(
                tool_name=cast(Literal["ask_user", "finish_task"],
                              tool_call_message.name)
            )

        if tool_call_message.tool_def is None:
            return None

        result, error = None, None
        try:
            result = execute_tool_sync(tool_call_message.tool_def,
                                      tool_call_message.arguments)
        except Exception as e:
            error = f"{type(e).__name__}: {str(e)}"

        tool_call_message.result = result
        tool_call_message.error = error

        return ToolExecutedEvent(
            tool_call_id=tool_call_message.id,
            result=result if error is None else None
        )

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
            last_message.result = "[System Message] User ignored this tool call."

        self._messages.append(message)

    def set_tool_call_result(self, tool_call_id: str, result: str):
        """
        Set the result for a tool call

        Raises:
            ToolCallNotFoundError
        """
        for message in self._messages:
            if message.role == "tool" and message.id == tool_call_id:
                message.result = result
                break
        raise ToolCallNotFoundError(tool_call_id)

    def run(self) -> Generator[AgentEvent]:
        """
        Run agent task and generate event stream

        Yields:
            AgentEvent: Various events during task execution
        """
        async_task_pool = use_async_task_pool()

        while self._is_running:
            chunk_queue = queue.Queue()
            self._current_task_id = async_task_pool.add_task(
                self._create_llm_call(chunk_queue)
            )

            while self._is_running:
                try:
                    chunk = chunk_queue.get(timeout=0.3)
                except queue.Empty:
                    continue

                yield chunk
                if isinstance(chunk, (MessageEndEvent, TaskInterruptedEvent, ErrorEvent)):
                    break

            try:
                tool_call_message = async_task_pool.wait_result(self._current_task_id)
            except AsyncTaskNotFoundError:
                # Task cancelled by user
                break

            if tool_call_message is None:
                # Exception occurred during LLM call
                break

            tool_event = self._process_tool_call_to_event(tool_call_message)
            if tool_event is not None:
                yield tool_event
                if isinstance(tool_event, (ToolRequirePermissionEvent, ToolRequireUserResponseEvent)):
                    break

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

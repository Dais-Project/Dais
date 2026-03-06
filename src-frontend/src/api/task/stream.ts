import type {
  ContinueTaskBody,
  ToolAnswerBody,
  ToolReviewBody,
  AgentEvent,
  TextChunkEvent,
  ToolCallChunkEvent,
  MessageStartEvent,
  MessageEndEvent,
  MessageReplaceEvent,
  ToolCallEndEvent,
  ToolExecutedEvent,
  ToolRequireUserResponseEvent,
  ErrorEvent,
  UsageChunkEvent,
  ToolRequirePermissionEvent,
} from "@/api/generated/schemas";
import { createSseStream } from "@/lib/sse";
import { API_BASE } from "..";

const TASK_STREAM_BASE_URL = new URL("api/tasks/", API_BASE);

export type TaskSseCallbacks = {
  // task status callbacks
  onTaskDone?: () => void;
  onTaskInterrupted?: () => void;

  // message related callbacks
  onMessageStart?: (data: MessageStartEvent) => void;
  onTextChunk?: (chunk: TextChunkEvent) => void;
  onToolCallChunk?: (chunk: ToolCallChunkEvent) => void;
  onUsageChunk?: (chunk: UsageChunkEvent) => void;
  onToolCallEnd?: (data: ToolCallEndEvent) => void;
  onMessageEnd?: (data: MessageEndEvent) => void;
  onMessageReplace?: (data: MessageReplaceEvent) => void;

  // tool related callbacks
  onToolExecuted?: (data: ToolExecutedEvent) => void;
  onToolRequireUserResponse?: (data: ToolRequireUserResponseEvent) => void;
  onToolRequirePermission?: (data: ToolRequirePermissionEvent) => void;

  // error and close callbacks
  onError?: (error: ErrorEvent) => void;
  onSseError?: (error: Error) => void;
  onClose?: () => void;
};

function createTaskSseStream(url: URL | string, body: object, callbacks: TaskSseCallbacks): AbortController {
  const abortController = createSseStream<AgentEvent>(url, {
    body,
    onMessage: ({ data }) => {
      switch (data?.event_id) {
        case "MESSAGE_START":
          callbacks.onMessageStart?.(data);
          break;

        case "TEXT_CHUNK":
          callbacks.onTextChunk?.(data);
          break;

        case "TOOL_CALL_CHUNK":
          callbacks.onToolCallChunk?.(data);
          break;

        case "USAGE_CHUNK":
          callbacks.onUsageChunk?.(data);
          break;

        case "MESSAGE_END":
          callbacks.onMessageEnd?.(data);
          break;

        case "MESSAGE_REPLACE":
          callbacks.onMessageReplace?.(data);
          break;

        case "TOOL_CALL_END":
          callbacks.onToolCallEnd?.(data);
          break;

        case "TOOL_EXECUTED":
          callbacks.onToolExecuted?.(data);
          break;

        case "TOOL_REQUIRE_USER_RESPONSE":
          callbacks.onToolRequireUserResponse?.(data);
          break;

        case "TOOL_REQUIRE_PERMISSION":
          callbacks.onToolRequirePermission?.(data);
          break;

        case "TASK_DONE":
          callbacks.onTaskDone?.();
          callbacks.onClose?.();
          abortController.abort();
          return;

        case "TASK_INTERRUPTED":
          callbacks.onTaskInterrupted?.();
          callbacks.onClose?.();
          abortController.abort();
          return;

        case "ERROR":
          callbacks.onError?.(data);
          break;

        default:
          console.warn("Unknown SSE event type:", data?.event_id);
      }
    },
    onError: callbacks.onSseError,
    onClose: callbacks.onClose,
  });
  return abortController;
}

export function continueTask(taskId: number, body: ContinueTaskBody, callbacks: TaskSseCallbacks): AbortController {
  return createTaskSseStream(new URL(`${taskId}/continue`, TASK_STREAM_BASE_URL), body, callbacks);
}

export function toolAnswer(taskId: number, body: ToolAnswerBody, callbacks: TaskSseCallbacks): AbortController {
  return createTaskSseStream(new URL(`${taskId}/tool_answer`, TASK_STREAM_BASE_URL), body, callbacks);
}

export function toolReview(taskId: number, body: ToolReviewBody, callbacks: TaskSseCallbacks): AbortController {
  return createTaskSseStream(new URL(`${taskId}/tool_reviews`, TASK_STREAM_BASE_URL), body, callbacks);
}

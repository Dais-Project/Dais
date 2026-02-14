/** biome-ignore-all lint/performance/noBarrelFile: To aggregate all task API exports */

import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  AgentEventType,
  ErrorEventData,
  MessageChunkEventData,
  MessageEndEventData,
  MessageReplaceEventData,
  MessageStartEventData,
  ToolCallEndEventData,
  ToolExecutedEventData,
  ToolRequirePermissionEventData,
  ToolRequireUserResponseEventData,
} from "../types/agent-stream";
import { API_BASE } from ".";
import type {
  ContinueTaskBody,
  ToolAnswerBody,
  ToolReviewBody,
} from "./generated/schemas";

export {
  getGetTaskQueryKey,
  getGetTasksQueryKey,
  useDeleteTask,
  useGetTaskSuspense,
  useGetTasksSuspense,
  useNewTask,
} from "./generated/endpoints/task/task";

export type TaskSseCallbacks = {
  // task status callbacks
  onTaskDone?: () => void;
  onTaskInterrupted?: () => void;

  // message related callbacks
  onMessageStart?: (data: MessageStartEventData) => void;
  onMessageEnd?: (data: MessageEndEventData) => void;
  onMessageChunk?: (chunk: MessageChunkEventData) => void;
  onMessageReplace?: (data: MessageReplaceEventData) => void;
  onToolCallEnd?: (data: ToolCallEndEventData) => void;

  // tool related callbacks
  onToolExecuted?: (data: ToolExecutedEventData) => void;
  onToolRequireUserResponse?: (data: ToolRequireUserResponseEventData) => void;
  onToolRequirePermission?: (data: ToolRequirePermissionEventData) => void;

  // error and close callbacks
  onError?: (error: Error) => void;
  onClose?: () => void;
};

function createTaskSseStream(
  url: string,
  body: object,
  callbacks: TaskSseCallbacks
): AbortController {
  const abortController = new AbortController();

  fetchEventSource(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: abortController.signal,

    async onopen(response) {
      if (response.ok) {
        return;
      }

      let errorMessage: string;
      try {
        const responseBody = await response.json();
        errorMessage = responseBody?.error ?? `HTTP_${response.status}`;
      } catch {
        errorMessage = response.statusText || `HTTP_${response.status}`;
      }

      throw new Error(errorMessage);
    },

    onmessage(event) {
      let data: unknown;
      try {
        if (event.data.length) {
          data = JSON.parse(event.data);
        } else {
          data = null;
        }
      } catch (error) {
        console.error(
          `\
Failed to parse SSE message
message type: ${event.event}
message data: ${event.data}
`,
          error
        );
        callbacks.onError?.(
          error instanceof Error
            ? error
            : new Error("Failed to parse SSE message")
        );
        return;
      }

      switch (event.event as AgentEventType) {
        case "MESSAGE_CHUNK":
          callbacks.onMessageChunk?.(data as MessageChunkEventData);
          break;

        case "MESSAGE_START":
          callbacks.onMessageStart?.(data as MessageStartEventData);
          break;

        case "MESSAGE_END":
          callbacks.onMessageEnd?.(data as MessageEndEventData);
          break;

        case "MESSAGE_REPLACE":
          callbacks.onMessageReplace?.(data as MessageReplaceEventData);
          break;

        case "TOOL_CALL_END":
          callbacks.onToolCallEnd?.(data as ToolCallEndEventData);
          break;

        case "TOOL_EXECUTED":
          callbacks.onToolExecuted?.(data as ToolExecutedEventData);
          break;

        case "TOOL_REQUIRE_USER_RESPONSE":
          callbacks.onToolRequireUserResponse?.(
            data as ToolRequireUserResponseEventData
          );
          break;

        case "TOOL_REQUIRE_PERMISSION":
          callbacks.onToolRequirePermission?.(
            data as ToolRequirePermissionEventData
          );
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
          callbacks.onError?.(new Error((data as ErrorEventData).message));
          break;

        default:
          console.warn("Unknown SSE event type:", event.event);
      }
    },

    onerror(error) {
      callbacks.onError?.(
        error instanceof Error ? error : new Error("SSE connection error")
      );
      throw error;
    },

    onclose() {
      callbacks.onClose?.();
    },
  });

  return abortController;
}

export function continueTask(
  taskId: number,
  body: ContinueTaskBody,
  callbacks: TaskSseCallbacks
): AbortController {
  return createTaskSseStream(
    `${API_BASE}/tasks/${taskId}/continue`,
    body,
    callbacks
  );
}

export function toolAnswer(
  taskId: number,
  body: ToolAnswerBody,
  callbacks: TaskSseCallbacks
): AbortController {
  return createTaskSseStream(
    `${API_BASE}/tasks/${taskId}/tool_answer`,
    body,
    callbacks
  );
}

export function toolReview(
  taskId: number,
  body: ToolReviewBody,
  callbacks: TaskSseCallbacks
): AbortController {
  return createTaskSseStream(
    `${API_BASE}/tasks/${taskId}/tool_reviews`,
    body,
    callbacks
  );
}

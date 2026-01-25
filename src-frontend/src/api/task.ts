import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { ToolCallChunk, UserMessage } from "@/types/message";
import type { TaskCreate, TaskRead, TaskUsage } from "@/types/task";
import { API_BASE, fetchApi, type PaginatedResponse } from "./index";

export async function fetchTasks(
  workspaceId: number,
  page = 1,
  perPage = 15
): Promise<PaginatedResponse<TaskRead>> {
  const params = new URLSearchParams({
    workspace_id: workspaceId.toString(),
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return await fetchApi<PaginatedResponse<TaskRead>>(
    `${API_BASE}/tasks?${params}`
  );
}

export async function fetchTaskById(taskId: number): Promise<TaskRead> {
  return await fetchApi<TaskRead>(`${API_BASE}/tasks/${taskId}`);
}

export async function createTask(taskData: TaskCreate): Promise<TaskRead> {
  return await fetchApi<TaskRead>(`${API_BASE}/tasks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// =========================================
// === === === Agent Event Types === === ===
// =========================================

export type MessageChunkEventData =
  | {
      type: "text";
      content: string;
    }
  | ({
      type: "usage";
    } & TaskUsage)
  | {
      type: "tool_call";
      data: ToolCallChunk;
    };

export type ToolExecutedEventData = {
  tool_call_id: string;
  result: string | null;
};

export type ToolRequireUserResponseEventData = {
  tool_name: "ask_user" | "finish_task";
};

export type ToolRequirePermissionEventData = {
  tool_call_id: string;
};

export type ErrorEventData = {
  message: string;
};

export type AgentEventType =
  | "MESSAGE_CHUNK"
  | "MESSAGE_START"
  | "MESSAGE_END"
  | "TASK_DONE"
  | "TASK_INTERRUPTED"
  | "TOOL_EXECUTED"
  | "TOOL_REQUIRE_USER_RESPONSE"
  | "TOOL_REQUIRE_PERMISSION"
  | "ERROR";

export type TaskSseCallbacks = {
  // message related callbacks
  onMessageStart?: () => void;
  onMessageEnd?: () => void;
  onMessageChunk?: (chunk: MessageChunkEventData) => void;

  // tool related callbacks
  onToolExecuted?: (data: ToolExecutedEventData) => void;
  onToolRequireUserResponse?: (data: ToolRequireUserResponseEventData) => void;
  onToolRequirePermission?: (data: ToolRequirePermissionEventData) => void;

  // task status callbacks
  onTaskDone?: () => void;
  onTaskInterrupted?: () => void;

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
      try {
        const data = JSON.parse(event.data);

        switch (event.event as AgentEventType) {
          case "MESSAGE_CHUNK":
            callbacks.onMessageChunk?.(data as MessageChunkEventData);
            break;

          case "MESSAGE_START":
            callbacks.onMessageStart?.();
            break;

          case "MESSAGE_END":
            callbacks.onMessageEnd?.();
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
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
        callbacks.onError?.(
          error instanceof Error
            ? error
            : new Error("Failed to parse SSE message")
        );
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

type ContinueTaskBody = {
  agent_id: number;
  message: UserMessage | null;
};

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

type ToolAnswerBody = {
  agent_id: number;
  tool_call_id: string;
  answer: string;
};

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

type ToolReviewBody = {
  agent_id: number;
  tool_call_id: string;
  status: "approve" | "deny";
  auto_approve: boolean;
};

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

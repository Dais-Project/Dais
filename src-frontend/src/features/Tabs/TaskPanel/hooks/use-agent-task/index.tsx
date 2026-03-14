import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { produce } from "immer";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  BuiltInTools,
  ErrorEvent,
  MessageEndEvent,
  MessageReplaceEvent,
  MessageStartEvent,
  TextChunkEvent,
  ToolCallChunkEvent,
  ToolCallEndEvent,
  ToolRequirePermissionEvent,
  ToolRequireUserResponseEvent,
  UsageChunkEvent,
  type TaskUsage,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
  type ToolReviewBody,
} from "@/api/generated/schemas";
import {
  continueTask,
  getGetTaskQueryKey,
  type TaskSseCallbacks,
  toolAnswer,
  toolReview,
  useGetTaskSuspense,
} from "@/api/task";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import { UiUserMessage, type SdkMessage } from "@/types/message";
import { UiMessage } from "@/types/message";
import { toUiMessage } from "@/types/message";
import { sendNotification } from "@/lib/notification";
import { useTabsStore } from "@/stores/tabs-store";
import { isForeground } from "@/lib/is-foreground";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { useMessageLifecycle } from "./use-message-lifecycle";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskStream<Body extends { agent_id: number }> = (
  taskId: number,
  body: Body,
  callbacks: TaskSseCallbacks
) => AbortController;

// --- --- --- --- --- ---

function findLatestTodoList(messages: SdkMessage[]): TodoItem[] | null {
  for (const message of messages.reverseIter()) {
    if (message.role === "tool" && message.name === BuiltInTools.ExecutionControl__update_todos) {
      const todoList = tryParseSchema(UpdateTodosSchema, message.arguments);
      if (todoList) {
        return todoList.todos;
      }
    }
  }
  return null;
}

// --- --- --- --- --- ---

export type AgentTaskState = {
  state: TaskState;
  todos: TodoItem[] | null;
  usage: TaskUsage;
  messages: UiMessage[];
  agentId: number | null;
};

export type AgentTaskActions = {
  setAgentId: (agentId: number) => void;
  continue: (message?: UiUserMessage) => void;
  answerTool: (toolCallId: string, answer: string) => void;
  reviewTool: (toolCallId: string, status: ToolReviewBody["status"], autoApprove: boolean) => void;
  cancel: () => void;
};

const AgentTaskStateContext = createContext<AgentTaskState | null>(null);
const AgentTaskActionContext = createContext<AgentTaskActions | null>(null);

type AgentTaskProviderProps = {
  taskId: number;
  children: React.ReactNode;
};

export function AgentTaskProvider({ taskId, children }: AgentTaskProviderProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const queryClient = useQueryClient();
  const setActiveTab = useTabsStore((state) => state.setActive);
  const backToCurrentTab = () => setActiveTab((tab) => (
    tab.type === "task" &&
    !tab.metadata.isDraft &&
    tab.metadata.id === taskId
  ));

  const { data } = useGetTaskSuspense(taskId, {
    query: {
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });

  const [agentId, setAgentId] = useState(data.agent_id);
  const [usage, setUsage] = useState<TaskUsage>(data.usage);
  const [messages, setMessages] = useState<UiMessage[]>(() => toUiMessage(data.messages));
  const [todos, setTodos] = useState<TodoItem[] | null>(() => {
    const todo = findLatestTodoList(data.messages);
    return todo ?? null;
  });

  const setData = useCallback(
    (updater: ImmerUpdater<UiMessage[]>) => {
      setMessages(
        produce((draft) => updater(draft))
      );
    },
    [setMessages]
  );

  const messageLifecycle = useMessageLifecycle({ setData });
  const textBuffer = useTextBuffer({
    onAccumulated: messageLifecycle.handleTextAccumulated,
  });
  const toolCallsBuffer = useToolCallBuffer({
    onAccumulated: messageLifecycle.handleToolCallAccumulated,
  });

  const sseCallbacksRef = useRef<TaskSseCallbacks>({});
  const { state, startStream, cancel } = useTaskStream({
    taskId,
    agentId,
    sseCallbacksRef,
  });

  const onMessageStart = (eventData: MessageStartEvent) => {
    messageLifecycle.handleMessageStart(eventData.message_id);
  };

  const onTextChunk = (chunk: TextChunkEvent) => {
    textBuffer.accumulate(chunk.message_id, chunk.content);
  };

  const onToolCallChunk = (chunk: ToolCallChunkEvent) => {
    const {event_id, ...toolCallChunk} = chunk;
    toolCallsBuffer.accumulate(toolCallChunk);
  };

  const onUsageChunk = (chunk: UsageChunkEvent) => {
    const { event_id, ...usage } = chunk;
    setUsage(usage);
  }

  const onMessageEnd = (eventData: MessageEndEvent) => {
    textBuffer.clear();
    toolCallsBuffer.flush();
    toolCallsBuffer.clear();
    messageLifecycle.handleMessageEnd(eventData.message);
  };

  const onMessageReplace = (eventData: MessageReplaceEvent) => {
    messageLifecycle.handleMessageReplace(eventData.message);
  }

  const onToolCallEnd = (eventData: ToolCallEndEvent) => {
    const { message } = eventData;
    messageLifecycle.handleToolCallEnd(message);

    switch (message.name) {
      case BuiltInTools.ExecutionControl__finish_task:
        if (!isForeground()) {
          sendNotification(t("notification.task_done"), {
            onClick: backToCurrentTab,
          });
        }
        break;
      case BuiltInTools.ExecutionControl__update_todos:
        const todoList = tryParseSchema(UpdateTodosSchema, message.arguments);
        if (todoList) {
          setTodos(todoList.todos);
        }
        break;
    }
  };

  const onToolRequireUserResponse = (_: ToolRequireUserResponseEvent) => {
    if (!isForeground()) {
      sendNotification(t("notification.require_response"), {
        onClick: backToCurrentTab,
      });
    }
  };

  const onToolRequirePermission = (eventData: ToolRequirePermissionEvent) => {
    if (!isForeground()) {
      sendNotification(
        t("notification.require_permission", {
          toolName: eventData.tool_name,
        }),
        { onClick: backToCurrentTab }
      );
    }
  };

  const onError = (eventData: ErrorEvent) => {
    toast.error(t("toast.task_failed.title"), {
      description: eventData.error,
    });
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
  };

  const onClose = () => {
    messageLifecycle.handleClose();
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
  }

  sseCallbacksRef.current = {
    onMessageStart,
    onTextChunk,
    onToolCallChunk,
    onUsageChunk,
    onMessageEnd,
    onMessageReplace,
    onToolCallEnd,
    onToolRequireUserResponse,
    onToolRequirePermission,
    onError,
    onClose,
  };

  const handleTaskContinue = useCallback(
    (message?: UiUserMessage) => {
      if (message) {
        setData((draft) => {
          draft.push(toUiMessage(message));
        });
      }
      startStream(continueTask, { message });
    },
    [setData, startStream]
  );

  const answerTool = useCallback(
    (toolCallId: string, answer: string) => {
      startStream(toolAnswer, { call_id: toolCallId, answer });
    },
    [startStream]
  );

  const reviewTool = useCallback(
    (toolCallId: string, status: ToolReviewBody["status"], autoApprove: boolean) => {
      startStream(toolReview, {
        call_id: toolCallId,
        auto_approve: autoApprove,
        status,
      });
    },
    [startStream]
  );

  const handleTaskCancel = useCallback(() => {
    cancel();
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
  }, [cancel]);


  const stateValue = useMemo(
    () => ({
      state,
      todos,
      usage,
      messages,
      agentId,
    }),
    [state, todos, usage, messages, agentId]
  );

  const actionValue = useMemo(
    () => ({
      setAgentId,
      continue: handleTaskContinue,
      answerTool,
      reviewTool,
      cancel: handleTaskCancel,
    }),
    [handleTaskContinue, answerTool, reviewTool, handleTaskCancel]
  );

  return (
    <AgentTaskActionContext value={actionValue}>
      <AgentTaskStateContext value={stateValue}>
        {children}
      </AgentTaskStateContext>
    </AgentTaskActionContext>
  );
}

export function useAgentTaskState() {
  const context = useContext(AgentTaskStateContext);
  if (!context) {
    throw new Error("useAgentTaskState must be used within AgentTaskProvider");
  }
  return context;
}

export function useAgentTaskAction() {
  const context = useContext(AgentTaskActionContext);
  if (!context) {
    throw new Error("useAgentTaskAction must be used within AgentTaskProvider");
  }
  return context;
}

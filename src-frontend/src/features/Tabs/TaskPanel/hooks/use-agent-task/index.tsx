import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { produce } from "immer";
import { toast } from "sonner";
import { useLatest } from "ahooks";
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
  type TaskRuntimeContext,
  type TaskUsage,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
  type ToolReviewBody,
} from "@/api/generated/schemas";
import {
  continueTask,
  type TaskSseCallbacks,
  useAppendTaskMessage,
  useEditTaskMessage,
  useToolAnswer,
  useToolReviews,
  useGetTaskRuntimeContextSuspense,
} from "@/api/task";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import { toSdkMessage, uiUserMessageFactory, type SdkMessage } from "@/types/message";
import { UiMessage } from "@/types/message";
import { toUiMessage } from "@/types/message";
import { sendNotification } from "@/lib/notification";
import { useTabsStore } from "@/stores/tabs-store";
import { isForeground } from "@/lib/is-foreground";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { useMessageLifecycle } from "./use-message-lifecycle";
import { useNotificationBuffer } from "./use-notification-buffer";
import { useTaskFlags } from "./use-task-flags";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskFlags = {
  isSuccess: boolean;
  requiresUserAction: boolean;
};

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
  flags: TaskFlags;
  todos: TodoItem[] | null;
  usage: TaskUsage;
  messages: UiMessage[];
  taskId: number;
  agentId: number | null;
};

export type AgentTaskActions = {
  setAgentId: (agentId: number) => void;
  answerTool: (toolCallId: string, answer: string) => void;
  reviewTool: (toolCallId: string, status: ToolReviewBody["status"], autoApprove: boolean) => void;
  appendMessage: (text: string, attachments: File[]) => void;
  editMessage: (messageId: string, content: string) => void;
  continue: () => void;
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
  const setActiveTab = useTabsStore((state) => state.setActive);
  const backToCurrentTab = () => setActiveTab((tab) => (
    tab.type === "task" &&
    !tab.metadata.isDraft &&
    tab.metadata.id === taskId
  ));

  const { data } = useGetTaskRuntimeContextSuspense(taskId, {
    query: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  });

  const [agentId, setAgentId] = useState(data.agent_id);
  const { flags, setFlag, reset: resetFlags } = useTaskFlags();
  const [usage, setUsage] = useState<TaskUsage>(data.usage);
  const [messages, setMessages] = useState<UiMessage[]>(() => toUiMessage(data.messages));
  const [todos, setTodos] = useState<TodoItem[] | null>(() => findLatestTodoList(data.messages) ?? null);

  const applyRuntimeContext = useCallback((runtimeContext: TaskRuntimeContext) => {
    setAgentId(runtimeContext.agent_id);
    setUsage(runtimeContext.usage);
    setMessages(toUiMessage(runtimeContext.messages));
    setTodos(findLatestTodoList(runtimeContext.messages) ?? null);
  }, []);

  const latestMessage = useLatest(messages);

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
  const permissionNotificationBuffer = useNotificationBuffer({
    multipleTitle: t("notification.require_permission_multiple"),
    options: { onClick: backToCurrentTab },
  });

  const sseCallbacksRef = useRef<TaskSseCallbacks>({});
  const { state, startStream, cancel } = useTaskStream({
    taskId,
    agentId,
    sseCallbacksRef,
  });

  const onMessageStart = (eventData: MessageStartEvent) => {
    resetFlags();
    messageLifecycle.handleMessageStart(eventData.message_id);
  };

  const onTextChunk = (chunk: TextChunkEvent) => {
    textBuffer.accumulate(chunk.message_id, chunk.content);
  };

  const onToolCallChunk = (chunk: ToolCallChunkEvent) => {
    const { event_id, ...toolCallChunk } = chunk;
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
        setFlag({ isSuccess: true });
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
    setFlag({ requiresUserAction: true });
    if (!isForeground()) {
      sendNotification(t("notification.require_response"), {
        onClick: backToCurrentTab,
      });
    }
  };

  const onToolRequirePermission = (eventData: ToolRequirePermissionEvent) => {
    setFlag({ requiresUserAction: true });
    if (!isForeground()) {
      permissionNotificationBuffer.enqueue(
        t("notification.require_permission", {
          toolName: eventData.tool_name,
        })
      );
    }
  };

  const onError = (eventData: ErrorEvent) => {
    if (!isForeground()) {
      sendNotification(t("notification.task_failed.title"), {
        body: t("notification.task_failed.description"),
        onClick: backToCurrentTab,
      });
    }
    toast.error(t("toast.task_failed.title"), {
      description: eventData.error,
    });
  };

  const onClose = () => {
    messageLifecycle.handleClose();
    const lastMessage = latestMessage.current.at(-1);
    const isLastMessageNonEmptyAssistantMessage = (
      lastMessage !== undefined &&
      lastMessage?.role === "assistant" &&
      lastMessage.content !== null &&
      lastMessage.content.length > 0
    );
    if (isLastMessageNonEmptyAssistantMessage) {
      setFlag({ requiresUserAction: true });
    }
    if (isLastMessageNonEmptyAssistantMessage && !isForeground()) {
      const notificationContent = t("notification.responded", { response: lastMessage.content });
      sendNotification(notificationContent, { onClick: backToCurrentTab });
    };
  };

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
    () => startStream(continueTask, {}),
    [setData, startStream]
  );

  const handleTaskCancel = useCallback(() => cancel(), [cancel]);

  /* Agent Task Controls */

  const answerToolMutation = useToolAnswer({
    mutation: {
      onSuccess(eventData) {
        sseCallbacksRef.current.onMessageReplace?.(eventData);
        handleTaskContinue();
      },
    },
  });

  const toolReviewMutation = useToolReviews({
    mutation: {
      onSuccess(eventData) {
        if (eventData) {
          sseCallbacksRef.current.onMessageReplace?.(eventData);
        }
        handleTaskContinue();
      },
    },
  });

  const appendMessageMutation = useAppendTaskMessage({
    mutation: {
      onSuccess(runtimeContext) {
        applyRuntimeContext(runtimeContext);
        handleTaskContinue();
      }
    }
  })

  const editMessageMutation = useEditTaskMessage({
    mutation: {
      onSuccess(runtimeContext) {
        applyRuntimeContext(runtimeContext);
        handleTaskContinue();
      },
    },
  });

  const answerTool = useCallback((toolCallId: string, answer: string) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    answerToolMutation.mutate({ taskId, data: { call_id: toolCallId, agent_id: agentId, answer } });
  }, [answerToolMutation, taskId]);

  const reviewTool = useCallback(
    (toolCallId: string, status: ToolReviewBody["status"], autoApprove: boolean) => {
      if (agentId === null) {
        toast.error("任务失败", { description: "请先选择一个 Agent。" });
        return;
      }
      toolReviewMutation.mutate({ taskId, data: { call_id: toolCallId, agent_id: agentId, status, auto_approve: autoApprove } });
    }, [toolReviewMutation, taskId, agentId]
  );

  const appendMessage = useCallback((text: string, attachments: File[]) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    const userMessage = uiUserMessageFactory(text);
    const body = JSON.stringify({
      message: toSdkMessage(userMessage),
      agent_id: agentId,
    });
    appendMessageMutation.mutate({ taskId, data: { body, uploaded_files: attachments } });
  }, [appendMessageMutation, taskId, agentId]);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    editMessageMutation.mutate({
      taskId, data: {
        message_id: messageId,
        agent_id: agentId,
        content
      }
    });
  }, [editMessageMutation, taskId]);

  const stateValue = useMemo(
    () => ({
      state,
      flags,
      todos,
      usage,
      messages,
      taskId,
      agentId,
    }),
    [state, flags, todos, usage, messages, taskId, agentId]
  );

  const actionValue = useMemo(
    () => ({
      setAgentId,
      answerTool,
      reviewTool,
      editMessage,
      appendMessage,
      continue: handleTaskContinue,
      cancel: handleTaskCancel,
    }),
    [
      answerTool,
      reviewTool,
      editMessage,
      appendMessage,
      handleTaskContinue,
      handleTaskCancel,
    ]
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

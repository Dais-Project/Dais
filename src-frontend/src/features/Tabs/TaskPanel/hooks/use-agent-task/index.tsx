import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { produce } from "immer";
import { toast } from "sonner";
import { useLatest } from "ahooks";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  BuiltInTools,
  type ErrorEvent,
  type MessageEndEvent,
  type MessageReplaceEvent,
  type MessageStartEvent,
  type TaskType,
  type TextChunkEvent,
  type ToolCallChunkEvent,
  type ToolCallEndEvent,
  type ToolRequirePermissionEvent,
  type ToolRequireUserResponseEvent,
  type UsageChunkEvent,
  type TaskRuntimeContext,
  type TaskUsage,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
} from "@/api/generated/schemas";
import {
  continueTask,
  type TaskSseCallbacks,
  useGetTaskRuntimeContextSuspense,
} from "@/api/tasks";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import type { SdkMessage } from "@/types/message";
import type { UiMessage } from "@/types/message";
import { toUiMessage } from "@/types/message";
import { sendNotification } from "@/lib/notification";
import { useTabsStore } from "@/stores/tabs-store";
import { isForeground } from "@/lib/is-foreground";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { useMessageLifecycle } from "./use-message-lifecycle";
import { useNotificationBuffer } from "./use-notification-buffer";
import { resolveInitialFlags, useTaskFlags } from "./use-task-flags";
import { sounds } from "@/components/audios";
import { useTaskControl, type UseTaskControlResult } from "./use-task-control";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskFlags = {
  isFinished: boolean;
  requiresUserResponse: boolean;
  requiresUserPermission: boolean;
};

// --- --- --- --- --- ---

function findLatestTodoList(messages: SdkMessage[]): TodoItem[] | null {
  for (const message of messages.reverseIter()) {
    if (
      message.role === "tool" &&
      message.name === BuiltInTools.ExecutionControl__update_todos
    ) {
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
  taskType: TaskType;
  agentId: number | null;
};

export type AgentTaskActions = {
  setAgentId: (agentId: number) => void;
  continue: () => void;
  cancel: () => void;
} & UseTaskControlResult;

const AgentTaskStateContext = createContext<AgentTaskState | null>(null);
const AgentTaskActionContext = createContext<AgentTaskActions | null>(null);

type AgentTaskProviderProps = {
  taskId: number;
  taskType: TaskType;
  children: React.ReactNode;
};

export function AgentTaskProvider({
  taskId,
  taskType,
  children,
}: AgentTaskProviderProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const backToCurrentTab = () =>
    setActiveTab(
      (tab) =>
        tab.type === "task" &&
        tab.metadata.type === taskType &&
        "id" in tab.metadata &&
        tab.metadata.id === taskId,
    );

  const { data } = useGetTaskRuntimeContextSuspense(taskType, taskId, {
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
  const {
    flags,
    setFlag,
    reset: resetFlags,
  } = useTaskFlags(() => resolveInitialFlags(data.messages));
  const [usage, setUsage] = useState<TaskUsage>(data.usage);
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    toUiMessage(data.messages),
  );
  const [todos, setTodos] = useState<TodoItem[] | null>(
    () => findLatestTodoList(data.messages) ?? null,
  );

  const applyRuntimeContext = useCallback(
    (runtimeContext: TaskRuntimeContext) => {
      setAgentId(runtimeContext.agent_id);
      setUsage(runtimeContext.usage);
      setMessages(toUiMessage(runtimeContext.messages));
      setTodos(findLatestTodoList(runtimeContext.messages) ?? null);
    },
    [],
  );

  const latestMessage = useLatest(messages);

  const setData = useCallback((updater: ImmerUpdater<UiMessage[]>) => {
    setMessages(produce((draft) => updater(draft)));
  }, []);

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
    taskType,
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
  };

  const onMessageEnd = (eventData: MessageEndEvent) => {
    textBuffer.clear();
    toolCallsBuffer.flush();
    toolCallsBuffer.clear();
    messageLifecycle.handleMessageEnd(eventData.message);
  };

  const onMessageReplace = (eventData: MessageReplaceEvent) => {
    messageLifecycle.handleMessageReplace(eventData.message);
  };

  const onToolCallEnd = (eventData: ToolCallEndEvent) => {
    const { message } = eventData;
    messageLifecycle.handleToolCallEnd(message);

    switch (message.name) {
      case BuiltInTools.ExecutionControl__finish_task:
        setFlag({ isFinished: true });
        if (isForeground()) {
          sounds.finished.play();
        } else {
          sendNotification(t("notification.task_done"), {
            onClick: backToCurrentTab,
          });
        }
        break;
      case BuiltInTools.ExecutionControl__update_todos: {
        const todoList = tryParseSchema(UpdateTodosSchema, message.arguments);
        if (todoList) {
          setTodos(todoList.todos);
        }
        break;
      }
    }
  };

  const onToolRequireUserResponse = (_: ToolRequireUserResponseEvent) => {
    setFlag({ requiresUserResponse: true });
    if (isForeground()) {
      sounds.notify.play();
    } else {
      sendNotification(t("notification.require_response"), {
        onClick: backToCurrentTab,
      });
    }
  };

  const onToolRequirePermission = (eventData: ToolRequirePermissionEvent) => {
    setFlag({ requiresUserPermission: true });
    if (isForeground()) {
      sounds.notify.play();
    } else {
      permissionNotificationBuffer.enqueue(
        t("notification.require_permission", {
          toolName: eventData.tool_name,
        }),
      );
    }
  };

  const onError = (eventData: ErrorEvent) => {
    if (isForeground()) {
      sounds.notify.play();
    } else {
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
    const isLastMessageNonEmptyAssistantMessage =
      lastMessage !== undefined &&
      lastMessage?.role === "assistant" &&
      lastMessage.content !== null &&
      lastMessage.content.length > 0;
    if (isLastMessageNonEmptyAssistantMessage) {
      setFlag({ requiresUserResponse: true });
      if (isForeground()) {
        sounds.notify.play();
      } else {
        const notificationContent = t("notification.responded", {
          response: lastMessage.content,
        });
        sendNotification(notificationContent, { onClick: backToCurrentTab });
      }
    }
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
    [startStream],
  );

  const handleTaskCancel = useCallback(() => {
    cancel();
    messageLifecycle.handleCancel();
  }, [messageLifecycle, cancel]);

  const taskControl = useTaskControl({
    taskId,
    taskType,
    agentId,
    onMessageReplace,
    onTaskContinue: handleTaskContinue,
    onUpdateRuntimeContext: applyRuntimeContext,
  });

  const stateValue = useMemo(
    () => ({
      state,
      flags,
      todos,
      usage,
      messages,
      taskId,
      taskType,
      agentId,
    }),
    [state, flags, todos, usage, messages, taskId, taskType, agentId],
  );

  const actionValue = useMemo(
    () => ({
      ...taskControl,
      setAgentId,
      continue: handleTaskContinue,
      cancel: handleTaskCancel,
    }),
    [taskControl, handleTaskContinue, handleTaskCancel],
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

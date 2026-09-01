import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLatest, useMount } from "ahooks";
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
  type TaskUsage,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
} from "@/api/generated/schemas";
import { type TaskSseCallbacks } from "@/api/tasks";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import type { UiMessage } from "@/types/message";
import { sendNotification } from "@/lib/notification";
import { isForeground } from "@/lib/is-foreground";
import { useTabPanelActions } from "../../../components/TabPanelActions";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { useMessageLifecycle } from "./use-message-lifecycle";
import { useNotificationBuffer } from "./use-notification-buffer";
import { sounds } from "@/components/audios";
import { useTaskControl, type UseTaskControlResult } from "./use-task-control";
import { useTaskRuntimeState } from "./use-task-runtime-state";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskFlags = {
  isFinished: boolean;
  requiresUserResponse: boolean;
  requiresUserPermission: boolean;
};

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
  const { activate: activateCurrentTab } = useTabPanelActions();

  const [runtimeStates, runtimeActions] = useTaskRuntimeState(taskType, taskId);
  const { revision, flags, agentId, usage, messages, todos } = runtimeStates;
  const {
    setAgentId,
    setFlag,
    resetFlags,
    setUsage,
    setTodos,
    setData,
    applyRuntimeContext,
  } = runtimeActions;

  useMount(() => {
    if (revision !== null) {
      handleTaskContinue(revision);
    }
  });

  const latestMessage = useLatest(messages);

  const messageLifecycle = useMessageLifecycle({ setData });
  const textBuffer = useTextBuffer({
    onAccumulated: messageLifecycle.handleTextAccumulated,
  });
  const toolCallsBuffer = useToolCallBuffer({
    onAccumulated: messageLifecycle.handleToolCallAccumulated,
  });
  const permissionNotificationBuffer = useNotificationBuffer({
    multipleTitle: t("notification.require_permission_multiple"),
    options: { onClick: activateCurrentTab },
  });

  const sseCallbacksRef = useRef<TaskSseCallbacks>({});
  const { state, startStream: handleTaskContinue, cancel } = useTaskStream({
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
            onClick: activateCurrentTab,
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
        onClick: activateCurrentTab,
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
        onClick: activateCurrentTab,
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
        sendNotification(notificationContent, { onClick: activateCurrentTab });
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

  const taskControl = useTaskControl({
    taskId,
    taskType,
    agentId,
    onMessageReplace,
    onTaskContinue: handleTaskContinue,
    onUpdateRuntimeContext: applyRuntimeContext,
  });

  const handleTaskCancel = useCallback(async () => {
    try {
      await taskControl.stop();
      cancel();
      messageLifecycle.handleCancel();
    } catch (error) {
      toast.error(t("toast.task_failed.title"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [taskControl, messageLifecycle, cancel, t]);

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
      continue: () => handleTaskContinue(),
      cancel: () => handleTaskCancel(),
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

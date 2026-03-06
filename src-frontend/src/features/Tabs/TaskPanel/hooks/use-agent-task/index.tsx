import { produce } from "immer";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BuiltInTools,
  type TaskUsage,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
  type ToolReviewBody,
} from "@/api/generated/schemas";
import {
  continueTask,
  type TaskSseCallbacks,
  toolAnswer,
  toolReview,
  useGetTaskSuspense,
} from "@/api/task";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import type {
  MessageChunkEventData,
  MessageEndEventData,
  MessageStartEventData,
  ToolCallEndEventData,
} from "@/types/agent-stream";
import { isToolMessage, UiUserMessage, type SdkMessage } from "@/types/message";
import { useMessageLifecycle } from "./use-message-lifecycle";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { UiMessage } from "@/types/message";
import { toUiMessage } from "@/types/message";

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
  const { state, setState, startStream, cancel } = useTaskStream({
    taskId,
    agentId,
    sseCallbacksRef,
  });

  const onMessageStart = useCallback(
    (eventData: MessageStartEventData) => {
      setState("running");
      messageLifecycle.handleMessageStart(eventData);
    },
    [setState, messageLifecycle.handleMessageStart]
  );

  const onMessageChunk = useCallback(
    (chunk: MessageChunkEventData) => {
      switch (chunk.type) {
        case "text":
          textBuffer.accumulate(chunk.content);
          break;
        case "tool_call": {
          toolCallsBuffer.accumulate(chunk.data);
          break;
        }
        case "usage": {
          setUsage((draft) => ({ ...draft, ...chunk }));
          break;
        }
        default:
          break;
      }
    },
    [textBuffer, toolCallsBuffer, setUsage]
  );

  const onMessageEnd = useCallback(
    (eventData: MessageEndEventData) => {
      textBuffer.clear();
      toolCallsBuffer.clear();
      messageLifecycle.handleMessageEnd(eventData);
    },
    [textBuffer, toolCallsBuffer, messageLifecycle.handleMessageEnd]
  );

  const onMessageReplace = messageLifecycle.handleMessageReplace;

  const onToolCallEnd = useCallback(
    (eventData: ToolCallEndEventData) => {
      setData((draft) => {
        const index = draft.findIndex(
          (m) => isToolMessage(m) && m.call_id === eventData.message.call_id
        );
        const uiMessage = toUiMessage(eventData.message);
        if (index === -1) {
          draft.push(uiMessage);
          return;
        }
        draft[index] = uiMessage;
      });
      // refresh todo list
      if (eventData.message.name === BuiltInTools.ExecutionControl__update_todos) {
        const todoList = tryParseSchema(UpdateTodosSchema, eventData.message.arguments);
        if (todoList) {
          setTodos(todoList.todos);
        }
      }
    },
    [setData, setTodos]
  );

  const onError = useCallback(
    (error: Error) => {
      toast.error("任务失败", {
        description: error.message || "任务失败，请稍后重试。",
      });
      setState("error");
    },
    [setState]
  );

  const onClose = useCallback(() => {
    messageLifecycle.handleClose();
    setState("idle");
  }, [messageLifecycle.handleClose, setState]);

  sseCallbacksRef.current = {
    onMessageStart,
    onMessageChunk,
    onMessageEnd,
    onMessageReplace,
    onToolCallEnd,
    onError,
    onClose,
  };

  const continue_ = useCallback(
    (message?: UiUserMessage) => {
      setState("waiting");
      if (message) {
        setData((draft) => {
          draft.push(toUiMessage(message));
        });
      }
      startStream(continueTask, { message });
    },
    [setState, setData, startStream]
  );

  const answerTool = useCallback(
    (toolCallId: string, answer: string) => {
      setState("waiting");
      startStream(toolAnswer, { call_id: toolCallId, answer });
    },
    [setState, startStream]
  );

  const reviewTool = useCallback(
    (toolCallId: string, status: ToolReviewBody["status"], autoApprove: boolean) => {
      setState("waiting");
      startStream(toolReview, {
        call_id: toolCallId,
        auto_approve: autoApprove,
        status,
      });
    },
    [setState, startStream]
  );

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
      continue: continue_,
      answerTool,
      reviewTool,
      cancel,
    }),
    [continue_, answerTool, reviewTool, cancel]
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

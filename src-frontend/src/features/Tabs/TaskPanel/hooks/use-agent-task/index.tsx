import { produce } from "immer";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BuiltInTools,
  ErrorEvent,
  MessageEndEvent,
  MessageReplaceEvent,
  MessageStartEvent,
  TextChunkEvent,
  ToolCallChunkEvent,
  ToolCallEndEvent,
  UsageChunkEvent,
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
import { UiUserMessage, type SdkMessage } from "@/types/message";
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
    (eventData: MessageStartEvent) => {
      setState("running");
      messageLifecycle.handleMessageStart(eventData.message_id);
    },
    [setState, messageLifecycle.handleMessageStart]
  );

  const onTextChunk = useCallback(
    (chunk: TextChunkEvent) => {
      textBuffer.accumulate(chunk.content);
    },
    [textBuffer]
  );

  const onToolCallChunk = useCallback(
    (chunk: ToolCallChunkEvent) => {
      const {event_id, ...toolCallChunk} = chunk;
      toolCallsBuffer.accumulate(toolCallChunk);
    },
    [toolCallsBuffer]
  );

  const onUsageChunk = useCallback(
    (chunk: UsageChunkEvent) => {
      const { event_id, ...usage } = chunk;
      setUsage(usage);
    },
    [setUsage]
  );

  const onMessageEnd = useCallback(
    (eventData: MessageEndEvent) => {
      textBuffer.clear();
      toolCallsBuffer.clear();
      messageLifecycle.handleMessageEnd(eventData.message);
    },
    [textBuffer, toolCallsBuffer, messageLifecycle.handleMessageEnd]
  );

  const onMessageReplace = useCallback(
    (eventData: MessageReplaceEvent) => {
      messageLifecycle.handleMessageReplace(eventData.message);
    },
    [messageLifecycle.handleMessageReplace]
  );

  const onToolCallEnd = useCallback(
    (eventData: ToolCallEndEvent) => {
      messageLifecycle.handleToolCallEnd(eventData.message);

      // refresh todo list
      if (eventData.message.name === BuiltInTools.ExecutionControl__update_todos) {
        const todoList = tryParseSchema(UpdateTodosSchema, eventData.message.arguments);
        if (todoList) {
          setTodos(todoList.todos);
        }
      }
    },
    [messageLifecycle.handleToolCallEnd, setTodos]
  );

  const onError = useCallback(
    (eventData: ErrorEvent) => {
      toast.error("任务失败", { description: eventData.error });
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
    onTextChunk,
    onToolCallChunk,
    onUsageChunk,
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

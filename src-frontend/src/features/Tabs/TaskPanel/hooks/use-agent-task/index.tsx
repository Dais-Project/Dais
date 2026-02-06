import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { produce } from "immer";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  continueTask,
  fetchTaskById,
  type MessageChunkEventData,
  type MessageEndEventData,
  type MessageReplaceEventData,
  type MessageStartEventData,
  type TaskSseCallbacks,
  type ToolCallEndEventData,
  type ToolReviewBody,
  toolAnswer,
  toolReview,
} from "@/api/task";
import {
  type AssistantMessage,
  isToolMessage,
  type Message,
  type ToolMessage,
  type UserMessage,
} from "@/types/message";
import type { TaskRead, TaskUsage } from "@/types/task";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { assistantMessageFactory, toolMessageFactory } from "./utils";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskStream<Body extends { agent_id: number }> = (
  taskId: number,
  body: Body,
  callbacks: TaskSseCallbacks
) => AbortController;

// --- --- --- --- --- ---

function handleTextAccumulated(
  allText: string,
  setData: (updater: (draft: TaskRead) => void) => void
) {
  setData((draft) => {
    const lastMessage = draft.messages.at(-1);
    if (lastMessage?.role === "assistant") {
      lastMessage.content = allText;
      return;
    }
    console.warn(
      "Last message is not assistant when text chunk is accumulated"
    );
  });
}

function handleToolCallAccumulated(
  toolCallId: string,
  toolCall: { name: string; arguments: string },
  setData: (updater: (draft: TaskRead) => void) => void
) {
  setData((draft) => {
    const toolMessage = draft.messages.find(
      (m) => isToolMessage(m) && m.tool_call_id === toolCallId
    ) as ToolMessage | undefined;
    if (toolMessage === undefined) {
      draft.messages.push(
        toolMessageFactory(
          toolCallId,
          toolCall.name,
          toolCall.arguments
        ) as ToolMessage
      );
      return;
    }
    toolMessage.name = toolCall.name;
    toolMessage.arguments = toolCall.arguments;
  });
}

// --- --- --- --- --- ---

export type AgentTaskState = {
  state: TaskState;
  usage: TaskUsage;
  data: TaskRead;
  agentId: number | null;
};

export type AgentTaskActions = {
  setAgentId: (agentId: number) => void;
  continue: (message?: UserMessage | null) => void;
  answerTool: (toolCallId: string, answer: string) => void;
  reviewTool: (
    toolCallId: string,
    status: ToolReviewBody["status"],
    autoApprove: boolean
  ) => void;
  cancel: () => void;
};

const AgentTaskStateContext = createContext<AgentTaskState | null>(null);
const AgentTaskActionContext = createContext<AgentTaskActions | null>(null);

type AgentTaskProviderProps = {
  taskId: number;
  children: React.ReactNode;
};

export function AgentTaskProvider({
  taskId,
  children,
}: AgentTaskProviderProps) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["task", taskId],
    queryFn: async () => await fetchTaskById(taskId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const [agentId, setAgentId] = useState(data.agent_id);

  const setData = useCallback(
    (updater: (draft: TaskRead) => void) => {
      queryClient.setQueryData<TaskRead>(["task", taskId], (old) =>
        produce(old, (draft) => draft && updater(draft))
      );
    },
    [queryClient, taskId]
  );

  const textBuffer = useTextBuffer({
    onAccumulated: (allText: string) => handleTextAccumulated(allText, setData),
  });

  const toolCallsBuffer = useToolCallBuffer({
    onAccumulated: (toolCallId, toolCall) =>
      handleToolCallAccumulated(toolCallId, toolCall, setData),
  });

  const sseCallbacksRef = useRef<TaskSseCallbacks>({});
  const { state, setState, usage, setUsage, startStream, cancel } =
    useTaskStream({ taskId, agentId, sseCallbacksRef });

  const onMessageStart = useCallback(
    (eventData: MessageStartEventData) => {
      setState("running");
      setData((draft) => {
        const newMessage = assistantMessageFactory() as AssistantMessage;
        newMessage.id = eventData.message_id;
        draft.messages.push(newMessage);
      });
    },
    [setState, setData]
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
      setData((draft) => {
        const index = draft.messages.findIndex(
          (m) => m.id === eventData.message.id
        );
        if (index === -1) {
          console.warn(
            `Message not found for replacement: ${eventData.message.id}`
          );
          return;
        }
        draft.messages[index] = eventData.message as Message;
      });
    },
    [textBuffer, toolCallsBuffer, setData]
  );

  const onMessageReplace = useCallback(
    (eventData: MessageReplaceEventData) => {
      setData((draft) => {
        const index = draft.messages.findIndex(
          (m) => m.id === eventData.message.id
        );
        if (index === -1) {
          console.warn(
            `Message not found for replacement: ${eventData.message.id}`
          );
          return;
        }
        draft.messages[index] = eventData.message as Message;
      });
    },
    [setData]
  );

  const onToolCallEnd = useCallback(
    (eventData: ToolCallEndEventData) => {
      setData((draft) => {
        const index = draft.messages.findIndex(
          (m) =>
            isToolMessage(m) &&
            m.tool_call_id === eventData.message.tool_call_id
        );
        if (index === -1) {
          draft.messages.push(eventData.message as ToolMessage);
          return;
        }
        draft.messages[index] = eventData.message as ToolMessage;
      });
    },
    [setData]
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
    setState("idle");
  }, [setState]);

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
    (message: UserMessage | null = null) => {
      setState("waiting");
      setData((draft) => {
        if (message) {
          draft.messages.push(message);
        }
      });
      startStream(continueTask, { message });
    },
    [setState, setData, startStream]
  );

  const answerTool = useCallback(
    (toolCallId: string, answer: string) => {
      setState("waiting");
      startStream(toolAnswer, { tool_call_id: toolCallId, answer });
    },
    [setState, startStream]
  );

  const reviewTool = useCallback(
    (
      toolCallId: string,
      status: ToolReviewBody["status"],
      autoApprove: boolean
    ) => {
      setState("waiting");
      startStream(toolReview, {
        tool_call_id: toolCallId,
        auto_approve: autoApprove,
        status,
      });
    },
    [setState, startStream]
  );

  const stateValue = useMemo(
    () => ({
      state,
      usage,
      data,
      agentId,
    }),
    [state, usage, data, agentId]
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

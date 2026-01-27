import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { produce } from "immer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  continueTask,
  fetchTaskById,
  type MessageChunkEventData,
  type TaskSseCallbacks,
  type ToolExecutedEventData,
  type ToolRequirePermissionEventData,
  type ToolReviewBody,
  toolAnswer,
  toolReview,
} from "@/api/task";
import {
  isToolMessage,
  type ToolMessage,
  type UserMessage,
} from "@/types/message";
import type { TaskRead, TaskUsage } from "@/types/task";
import { useTaskStream } from "./use-task-stream";
import { useTextBuffer } from "./use-text-buffer";
import { useToolCallBuffer } from "./use-tool-call-buffer";
import { emptyAssistantMessage, toolMessageFactory } from "./utils";

export type TaskState = "idle" | "waiting" | "running" | "error";

export type TaskStream<Body extends { agent_id: number }> = (
  taskId: number,
  body: Body,
  callbacks: TaskSseCallbacks
) => AbortController;

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

  const setTaskData = useCallback(
    (updater: (draft: TaskRead) => void) => {
      queryClient.setQueryData<TaskRead>(["task", taskId], (old) =>
        produce(old, (draft) => draft && updater(draft))
      );
    },
    [queryClient, taskId]
  );

  const textBuffer = useTextBuffer({
    onAccumulated: useCallback(
      (allText: string) => {
        console.log("text accumulated: ");
        setTaskData((draft) => {
          const lastMessage = draft.messages.at(-1);
          if (lastMessage?.role === "assistant") {
            lastMessage.content = allText;
            return;
          }
          draft.messages.push(emptyAssistantMessage());
        });
      },
      [setTaskData]
    ),
  });

  const toolCallsBuffer = useToolCallBuffer({
    onAccumulated: useCallback(
      (toolCallId: string, toolCall: { name: string; arguments: string }) => {
        console.log("on tool call accumulated: ", toolCallId, toolCall);
        setTaskData((draft) => {
          const toolMessage = draft.messages.find(
            (m) => isToolMessage(m) && m.id === toolCallId
          ) as ToolMessage | undefined;
          if (toolMessage === undefined) {
            draft.messages.push(
              toolMessageFactory(toolCallId, toolCall.name, toolCall.arguments)
            );
            return;
          }
          toolMessage.name = toolCall.name;
          toolMessage.arguments = toolCall.arguments;
        });
      },
      [setTaskData]
    ),
  });

  const sseCallbacksRef = useRef<TaskSseCallbacks>({});

  const { state, setState, usage, setUsage, startStream, cancel } =
    useTaskStream(taskId, agentId, sseCallbacksRef.current);

  const onMessageStart = useCallback(() => {
    setState("running");
    setTaskData((draft) => {
      draft.messages.push(emptyAssistantMessage());
    });
  }, [setState, setTaskData]);

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

  const onMessageEnd = useCallback(() => {
    textBuffer.clear();
    toolCallsBuffer.clear();
  }, [textBuffer, toolCallsBuffer]);

  const onToolRequirePermission = useCallback(
    (toolData: ToolRequirePermissionEventData) => {
      setTaskData((draft) => {
        const toolMessage = draft.messages.find(
          (m) => isToolMessage(m) && m.id === toolData.tool_call_id
        ) as ToolMessage | undefined;
        if (toolMessage === undefined) {
          console.warn(`Tool message not found: ${toolData.tool_call_id}`);
          return;
        }
        toolMessage.metadata.user_approval = "pending";
      });
    },
    [setTaskData]
  );

  const onToolExecuted = useCallback(
    (toolResult: ToolExecutedEventData) => {
      setTaskData((draft) => {
        const toolMessage = draft.messages.find(
          (m) => isToolMessage(m) && m.id === toolResult.tool_call_id
        ) as ToolMessage | undefined;
        if (toolMessage === undefined) {
          console.warn(`Tool message not found: ${toolResult.tool_call_id}`);
          return;
        }
        toolMessage.result = toolResult.result;
      });
    },
    [setTaskData]
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

  useEffect(() => {
    sseCallbacksRef.current = {
      onMessageStart,
      onMessageChunk,
      onMessageEnd,
      onToolRequirePermission,
      onToolExecuted,
      onError,
      onClose,
    };
  }, [
    onMessageStart,
    onMessageChunk,
    onMessageEnd,
    onToolRequirePermission,
    onToolExecuted,
    onError,
    onClose,
  ]);

  const continue_ = useCallback(
    (message: UserMessage | null = null) => {
      setState("waiting");
      setTaskData((draft) => {
        if (message) {
          draft.messages.push(message);
        }
      });
      startStream(continueTask, { message });
    },
    [setState, setTaskData, startStream]
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
      setTaskData((draft) => {
        const toolMessage = draft.messages.find(
          (m) => isToolMessage(m) && m.id === toolCallId
        ) as ToolMessage | undefined;
        if (toolMessage === undefined) {
          console.warn(`Tool message not found: ${toolCallId}`);
          return;
        }
        toolMessage.metadata.user_approval = status;
      });
      startStream(toolReview, {
        tool_call_id: toolCallId,
        auto_approve: autoApprove,
        status,
      });
    },
    [setState, setTaskData, startStream]
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

import { current } from "immer";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Updater } from "use-immer";
import { continueTask, type TaskSseCallbacks, toolAnswer } from "@/api/task";
import type { ToolCallChunk, ToolMessage, UserMessage } from "@/types/message";
import type { TaskRead, TaskUsage } from "@/types/task";

export type TaskState = "idle" | "waiting" | "running";

export type TaskRunner = {
  continue: (taskId: number, messages: UserMessage | null) => void;
  answerTool: (taskId: number, toolCallId: string, answer: string) => void;
  cancel: () => void;
  handleCustomToolAction: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
  state: TaskState;
  usage: TaskUsage;
};

export function useTaskRunner(
  setTaskData: Updater<TaskRead | null>,
  onError?: (error: Error) => void
): TaskRunner {
  const [state, setState] = useState<TaskState>("idle");
  const [usage, setUsage] = useState<TaskUsage>({
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    max_tokens: 0,
  });
  const abortController = useRef<AbortController | null>(null);
  const toolCallsBuffer = useRef(
    new Map<
      number,
      {
        id: string;
        name: string;
        arguments: string;
      }
    >()
  );
  const sseCallbacks = useRef<TaskSseCallbacks>({
    onMessageStart: () => {
      setState("running");
      toolCallsBuffer.current.clear();
      setTaskData((draft) => {
        if (!draft) {
          return;
        }
        draft.messages.push({
          role: "assistant",
          content: "",
          reasoning_content: null,
          tool_calls: null,
          audio: null,
          images: null,
        });
      });
    },
    onMessageChunk: (chunk) => {
      switch (chunk.type) {
        case "text":
          accumulateText(chunk.content);
          break;
        case "tool_call": {
          accumulateToolCall(chunk.data);
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
    onMessageEnd: () => {
      setTaskData((draft) => {
        if (!draft) {
          return;
        }

        for (const toolCall of toolCallsBuffer.current.values()) {
          draft.messages.push({
            role: "tool",
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments,
            result: null,
            error: null,
          } satisfies ToolMessage);
        }

        toolCallsBuffer.current.clear();
      });
    },
    onToolExecuted: (toolResult) => {
      setTaskData((draft) => {
        if (!draft) {
          return;
        }
        const toolMessage = draft.messages.find(
          (m) => m.role === "tool" && m.id === toolResult.tool_call_id
        ) as ToolMessage | undefined;
        if (toolMessage === undefined) {
          console.warn(`Tool message not found: ${toolResult.tool_call_id}`);
          return;
        }
        toolMessage.result = toolResult.result;
      });
    },
    onError: (error) => {
      toast.error("任务失败", {
        description: error.message || "任务失败，请稍后重试。",
      });
      abortController.current = null;
      onError?.(error);
      setState("idle");
    },
    onClose: () => {
      abortController.current = null;
      setState("idle");
    },
  });

  const accumulateText = (text: string) => {
    setTaskData((draft) => {
      if (!draft) {
        return;
      }
      const lastMessage = draft.messages.at(-1);
      if (lastMessage?.role === "assistant") {
        lastMessage.content += text;
        return;
      }
      draft.messages.push({
        role: "assistant",
        content: text,
        reasoning_content: null,
        tool_calls: null,
        audio: null,
        images: null,
      });
    });
  };

  const accumulateToolCall = (toolCallChunk: ToolCallChunk) => {
    const existing = toolCallsBuffer.current.get(toolCallChunk.index);

    if (existing) {
      existing.arguments += toolCallChunk.arguments;
      if (toolCallChunk.id) {
        existing.id = toolCallChunk.id;
      }
      if (toolCallChunk.name) {
        existing.name = toolCallChunk.name;
      }
    } else {
      toolCallsBuffer.current.set(toolCallChunk.index, {
        id: toolCallChunk.id ?? "",
        name: toolCallChunk.name ?? "",
        arguments: toolCallChunk.arguments,
      });
    }
  };

  const continue_ = (taskId: number, messages: UserMessage | null) => {
    setState("waiting");
    abortController.current?.abort();

    setTaskData((draft) => {
      if (!draft) {
        return;
      }
      if (messages) {
        draft.messages.push(messages);
      }
    });

    abortController.current = continueTask(
      taskId,
      messages,
      sseCallbacks.current
    );
  };

  const answerTool = (taskId: number, toolCallId: string, answer: string) => {
    setState("waiting");
    abortController.current?.abort();
    abortController.current = toolAnswer(
      taskId,
      toolCallId,
      answer,
      sseCallbacks.current
    );
  };

  const handleCustomToolAction = (
    toolMessageId: string,
    _event: string,
    data: string
  ) => {
    let changedToolMessage: ToolMessage | null = null;
    setTaskData((draft) => {
      if (!draft) {
        return;
      }
      const toolMessage = draft.messages.find(
        (m) => m.role === "tool" && m.id === toolMessageId
      ) as ToolMessage | undefined;
      if (toolMessage === undefined) {
        console.warn(`Tool message not found: ${toolMessageId}`);
        return;
      }
      toolMessage.result = data;
      changedToolMessage = current(toolMessage);
    });
    return changedToolMessage;
  };

  const cancel = () => {
    abortController.current?.abort();
    abortController.current = null;
    setState("idle");
  };

  // cancel when unmount
  useEffect(() => cancel, []);

  return {
    continue: continue_,
    answerTool,
    cancel,
    handleCustomToolAction,

    state,
    usage,
  };
}

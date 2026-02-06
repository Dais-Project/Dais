import { useUnmount } from "ahooks";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { TaskSseCallbacks } from "@/api/task";
import type { TaskUsage } from "@/types/task";
import type { TaskState } from ".";

type TaskStreamProps = {
  taskId: number;
  agentId: number | null;
  sseCallbacksRef: RefObject<TaskSseCallbacks>;
};

type TaskStreamResult = {
  state: TaskState;
  setState: Dispatch<SetStateAction<TaskState>>;
  usage: TaskUsage;
  setUsage: Dispatch<SetStateAction<TaskUsage>>;
  startStream: <Body extends Record<string, unknown>>(
    streamApi: TaskStreamFn<Body & { agent_id: number }>,
    body: Body
  ) => void;
  cancel: () => void;
};

export type TaskStreamFn<Body extends { agent_id: number }> = (
  taskId: number,
  body: Body,
  callbacks: TaskSseCallbacks
) => AbortController;

export function useTaskStream({
  taskId,
  agentId,
  sseCallbacksRef,
}: TaskStreamProps): TaskStreamResult {
  const [state, setState] = useState<TaskState>("idle");
  const [usage, setUsage] = useState<TaskUsage>({
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    max_tokens: 0,
  });
  const abortController = useRef<AbortController | null>(null);
  useUnmount(() => abortController.current?.abort());

  const startStream = useCallback(
    <Body extends Record<string, unknown>>(
      streamApi: TaskStreamFn<Body & { agent_id: number }>,
      body: Body
    ) => {
      const overrideCallbacks: TaskSseCallbacks = {
        ...sseCallbacksRef.current,
        onClose: () => {
          abortController.current = null;
          sseCallbacksRef.current.onClose?.();
        },
      };
      if (agentId === null) {
        toast.error("任务失败", {
          description: "请先选择一个 Agent。",
        });
        return;
      }
      setState("waiting");
      if (abortController.current) {
        console.log("Aborting previous stream...");
        abortController.current?.abort();
      }
      abortController.current = streamApi(
        taskId,
        {
          ...body,
          agent_id: agentId,
        },
        overrideCallbacks
      );
    },
    [taskId, agentId, sseCallbacksRef]
  );

  const cancel = () => {
    abortController.current?.abort();
    abortController.current = null;
    setState("idle");
  };

  return {
    state,
    setState,
    usage,
    setUsage,
    startStream,
    cancel,
  };
}

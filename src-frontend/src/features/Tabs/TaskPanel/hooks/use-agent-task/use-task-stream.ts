import { Dispatch, type RefObject, SetStateAction, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { TaskSseCallbacks } from "@/api/tasks";
import type { TaskState } from ".";
import { useUnmount } from "ahooks";

type TaskStreamProps = {
  taskId: number;
  agentId: number | null;
  sseCallbacksRef: RefObject<TaskSseCallbacks>;
};

type TaskStreamResult = {
  state: TaskState;
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

function createOverrideCallbacks(
  sseCallbacksRef: RefObject<TaskSseCallbacks>,
  setState: Dispatch<SetStateAction<TaskState>>,
): TaskSseCallbacks {
  const overrides: TaskSseCallbacks = {
    onMessageStart(...args) {
      setState("running");
      sseCallbacksRef.current.onMessageStart?.(...args);
    },
    onError(...args) {
      setState("error");
      sseCallbacksRef.current.onError?.(...args);
    },
    onClose() {
      setState((prev) => {
        if (prev === "error") return prev;
        return "idle";
      });
      sseCallbacksRef.current.onClose?.();
    },
  };
  return new Proxy({} as TaskSseCallbacks, {
    get(_, key: string) {
      return overrides[key as keyof TaskSseCallbacks]
        ?? sseCallbacksRef.current[key as keyof TaskSseCallbacks];
    },
  });
}

export function useTaskStream({ taskId, agentId, sseCallbacksRef }: TaskStreamProps): TaskStreamResult {
  const [state, setState] = useState<TaskState>("idle");
  const abortController = useRef<AbortController | null>(null);

  const startStream = useCallback(
    <Body extends Record<string, unknown>>(streamApi: TaskStreamFn<Body & { agent_id: number }>, body: Body) => {
      const overrideCallbacks = createOverrideCallbacks(sseCallbacksRef, setState);
      if (agentId === null) {
        toast.error("任务失败", { description: "请先选择一个 Agent。" });
        return;
      }

      if (state !== "idle" && state !== "error") {
        console.warn("Previous stream is not finished yet.");
        return;
      }

      setState("waiting");
      if (abortController.current) {
        console.warn("Aborting previous stream...");
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
    [taskId, agentId, sseCallbacksRef, setState]
  );

  const cancel = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    setState("idle");
  }, [setState]);

  useUnmount(cancel);

  return {
    state,
    startStream,
    cancel,
  };
}

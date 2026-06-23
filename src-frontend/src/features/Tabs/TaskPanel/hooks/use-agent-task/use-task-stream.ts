import {
  Dispatch,
  type RefObject,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useUnmount } from "ahooks";
import type { TaskType } from "@/api/generated/schemas";
import type { TaskSseCallbacks } from "@/api/tasks";
import { useWakeLock } from "@/hooks/use-wake-lock";
import type { TaskState } from ".";

type TaskStreamProps = {
  taskType: TaskType;
  taskId: number;
  agentId: number | null;
  sseCallbacksRef: RefObject<TaskSseCallbacks>;
};

type TaskStreamResult = {
  state: TaskState;
  startStream: <Body extends Record<string, unknown>>(
    streamApi: TaskStreamFn<Body & { agent_id: number }>,
    body: Body,
  ) => void;
  cancel: () => void;
};

export type TaskStreamFn<Body extends { agent_id: number }> = (
  taskType: TaskType,
  taskId: number,
  body: Body,
  callbacks: TaskSseCallbacks,
) => AbortController;

function createOverrideCallbacks(
  abortController: RefObject<AbortController | null>,
  wakeLock: ReturnType<typeof useWakeLock>,
  setState: Dispatch<SetStateAction<TaskState>>,
  sseCallbacksRef: RefObject<TaskSseCallbacks>,
): TaskSseCallbacks {
  const overrides: TaskSseCallbacks = {
    onTaskStart(...args) {
      setState("running");
      wakeLock.acquire();
      sseCallbacksRef.current.onTaskStart?.(...args);
    },
    onMessageStart(...args) {
      sseCallbacksRef.current.onMessageStart?.(...args);
    },
    onError(...args) {
      wakeLock.release();
      setState("error");
      sseCallbacksRef.current.onError?.(...args);
      abortController.current = null;
    },
    onClose() {
      wakeLock.release();
      setState((prev) => {
        if (prev === "error") return prev;
        return "idle";
      });
      sseCallbacksRef.current.onClose?.();
      abortController.current = null;
    },
  };
  return new Proxy({} as TaskSseCallbacks, {
    get(_, key: string) {
      return (
        overrides[key as keyof TaskSseCallbacks] ??
        sseCallbacksRef.current[key as keyof TaskSseCallbacks]
      );
    },
  });
}

export function useTaskStream({
  taskType,
  taskId,
  agentId,
  sseCallbacksRef,
}: TaskStreamProps): TaskStreamResult {
  const [state, setState] = useState<TaskState>("idle");
  const abortController = useRef<AbortController | null>(null);
  const wakeLock = useWakeLock();

  const startStream = useCallback(
    <Body extends Record<string, unknown>>(
      streamApi: TaskStreamFn<Body & { agent_id: number }>,
      body: Body,
    ) => {
      const overrideCallbacks = createOverrideCallbacks(
        abortController,
        wakeLock,
        setState,
        sseCallbacksRef,
      );
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
        taskType,
        taskId,
        {
          ...body,
          agent_id: agentId,
        },
        overrideCallbacks,
      );
    },
    [state, taskId, taskType, agentId, wakeLock],
  );

  const cancel = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    wakeLock.release();
    setState("idle");
  }, [wakeLock]);

  useUnmount(cancel);

  return useMemo(
    () => ({
      state,
      startStream,
      cancel,
    }),
    [state, startStream, cancel],
  );
}

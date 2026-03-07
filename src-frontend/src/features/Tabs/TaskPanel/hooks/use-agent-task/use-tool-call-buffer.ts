import { useThrottleFn } from "ahooks";
import { useCallback, useRef } from "react";
import type { ToolCallChunkEvent } from "@/api/generated/schemas";

type ToolCallChunk = Omit<ToolCallChunkEvent, "event_id">;

export type ToolCallBuffer = {
  call_id: string;
  name: string;
  arguments: string;
};

type UseToolCallBufferProps = {
  onAccumulated?: (toolCallId: string, toolCall: ToolCallBuffer) => void;
  throttleDelay?: number;
};

export type ToolCallBufferHook = {
  toolCalls: Map<number, ToolCallBuffer>;
  accumulate: (chunk: ToolCallChunk) => void;
  clear: () => void;
};

export function useToolCallBuffer({
  onAccumulated,
  throttleDelay = 100,
}: UseToolCallBufferProps = {}): ToolCallBufferHook {
  const toolCallsRef = useRef<Map<number, ToolCallBuffer>>(new Map());

  const { run: accumulateNotify, cancel: cancelThrottle } = useThrottleFn(
    (...args: [toolCallId: string, toolCall: ToolCallBuffer]) =>
      onAccumulated?.(...args),
    { wait: throttleDelay }
  );

  const accumulate = useCallback(
    (chunk: ToolCallChunk) => {
      const existing = toolCallsRef.current.get(chunk.index);
      let currentBuffer: ToolCallBuffer;
      if (existing) {
        existing.arguments += chunk.arguments;
        if (chunk.call_id) {
          existing.call_id = chunk.call_id;
        }
        if (chunk.name) {
          existing.name = chunk.name;
        }
        currentBuffer = { ...existing };
      } else {
        const newBuffer = {
          call_id: chunk.call_id ?? "",
          name: chunk.name ?? "",
          arguments: chunk.arguments ?? "",
        } satisfies ToolCallBuffer;
        toolCallsRef.current.set(chunk.index, newBuffer);
        currentBuffer = { ...newBuffer };
      }
      accumulateNotify(currentBuffer.call_id, { ...currentBuffer });
    },
    [accumulateNotify]
  );

  const clear = useCallback(() => {
    toolCallsRef.current.clear();
    cancelThrottle();
  }, [cancelThrottle]);

  return {
    toolCalls: toolCallsRef.current,
    accumulate,
    clear,
  };
}

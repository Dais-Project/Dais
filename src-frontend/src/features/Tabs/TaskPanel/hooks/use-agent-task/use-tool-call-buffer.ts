import { useThrottleFn } from "ahooks";
import { useCallback, useRef } from "react";
import type { ToolCallChunk } from "@/types/message";

export type ToolCallBuffer = {
  id: string;
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

  const { run: accumulateNotify } = useThrottleFn(
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
        if (chunk.id) {
          existing.id = chunk.id;
        }
        if (chunk.name) {
          existing.name = chunk.name;
        }
        currentBuffer = { ...existing };
      } else {
        const newBuffer = {
          id: chunk.id ?? "",
          name: chunk.name ?? "",
          arguments: chunk.arguments,
        };
        toolCallsRef.current.set(chunk.index, newBuffer);
        currentBuffer = { ...newBuffer };
      }
      accumulateNotify(currentBuffer.id, { ...currentBuffer });
    },
    [accumulateNotify]
  );

  const clear = useCallback(() => {
    toolCallsRef.current.clear();
  }, []);

  return {
    toolCalls: toolCallsRef.current,
    accumulate,
    clear,
  };
}

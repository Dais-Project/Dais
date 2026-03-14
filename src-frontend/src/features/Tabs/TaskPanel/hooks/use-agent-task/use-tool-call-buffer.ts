import { useThrottleFn } from "ahooks";
import { useRef } from "react";
import type { ToolCallChunkEvent } from "@/api/generated/schemas";

type ToolCallChunk = Omit<ToolCallChunkEvent, "event_id">;

export type ToolCallBuffer = {
  call_id: string;
  name: string;
  arguments: string;
};

type UseToolCallBufferProps = {
  onAccumulated?: (toolCalls: ToolCallBuffer[]) => void;
  throttleDelay?: number;
};

export type ToolCallBufferHook = {
  toolCalls: Map<number, ToolCallBuffer>;
  accumulate: (chunk: ToolCallChunk) => void;
  flush: () => void;
  clear: () => void;
};

export function useToolCallBuffer({
  onAccumulated,
  throttleDelay = 100,
}: UseToolCallBufferProps = {}): ToolCallBufferHook {
  const toolCallsRef = useRef<Map<number, ToolCallBuffer>>(new Map());

  const { run: accumulateNotify, cancel: cancelThrottle } = useThrottleFn(
    () => flush(),
    { wait: throttleDelay }
  );

  const accumulate = (chunk: ToolCallChunk) => {
    const existing = toolCallsRef.current.get(chunk.index);
    if (existing) {
      if (chunk.arguments) {
        existing.arguments += chunk.arguments;
      }
      if (chunk.call_id) {
        existing.call_id = chunk.call_id;
      }
      if (chunk.name) {
        existing.name = chunk.name;
      }
    } else {
      const newBuffer = {
        call_id: chunk.call_id ?? "",
        name: chunk.name ?? "",
        arguments: chunk.arguments ?? "",
      } satisfies ToolCallBuffer;
      toolCallsRef.current.set(chunk.index, newBuffer);
    }
    accumulateNotify();
  };

  const flush = () => {
    const toolCalls = Array.from(toolCallsRef.current.values());
    const copies = toolCalls.map(call => ({ ...call }));
    onAccumulated?.(copies);
  };

  const clear = () => {
    toolCallsRef.current.clear();
    cancelThrottle();
  };

  return {
    toolCalls: toolCallsRef.current,
    accumulate,
    flush,
    clear,
  };
}

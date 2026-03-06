import { useMemo } from "react";
import type { z } from "zod";
import { ToolMessageArguments } from "@/api/generated/schemas";
import { UiToolMessage } from "@/types/message";
import { useThrottle } from "ahooks";

export function useToolArgument<T extends Record<string, unknown>>(
  message: UiToolMessage,
  schema: z.ZodType<T>
): T | null {
  const throttledArguments = useThrottle(message.arguments, { wait: 300 });
  return useMemo(() => {
    if (message.isStreaming) {
      return null;
    }
    try {
      return schema.parse(throttledArguments as ToolMessageArguments);
    } catch {
      return null;
    }
  }, [message.isStreaming, throttledArguments, schema]);
}

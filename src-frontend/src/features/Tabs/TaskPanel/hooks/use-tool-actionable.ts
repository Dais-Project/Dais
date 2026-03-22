import { useState } from "react";
import type { UiToolMessage } from "@/types/message";

export type UseToolActionableResult = {
  hasResult: boolean;
  disabled: boolean;
  markAsSubmitted: () => void;
};

export function useToolActionable(message: UiToolMessage): UseToolActionableResult {
  const [submitted, setSubmitted] = useState(false);
  const hasResult = message.result !== null || message.error !== null;
  return {
    hasResult,
    disabled: message.isStreaming || hasResult || submitted,
    markAsSubmitted: () => setSubmitted(true),
  };
}

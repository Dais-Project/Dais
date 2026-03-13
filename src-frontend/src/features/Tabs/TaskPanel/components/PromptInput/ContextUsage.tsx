import { useMemo } from "react";
import type { TaskUsage } from "@/api/generated/schemas";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  type ContextProps,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { useAgentTaskState } from "../../hooks/use-agent-task";

function createUiUsage(usage: TaskUsage): ContextProps["usage"] {
  return {
    inputTokens: usage.accumulated_input_tokens,
    outputTokens: usage.accumulated_output_tokens,
    totalTokens: usage.accumulated_input_tokens + usage.accumulated_output_tokens,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
  };
}

export function ContextUsage() {
  const { usage } = useAgentTaskState();
  const uiUsage = useMemo(() => createUiUsage(usage), [usage]);
  if (usage.max_tokens === 0
   || usage.accumulated_input_tokens === 0
   || usage.accumulated_output_tokens === 0
  ) {
    return null;
  }
  return (
    <Context
      usage={uiUsage}
      maxTokens={usage.max_tokens}
      usedTokens={usage.total_tokens}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
      </ContextContent>
    </Context>
  );
}

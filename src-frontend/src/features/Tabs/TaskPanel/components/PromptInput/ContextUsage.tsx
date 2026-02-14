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

function createUiUsage(usage: TaskUsage): ContextProps["usage"] {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
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

type ContextUsageProps = {
  usage: TaskUsage;
};

export function ContextUsage({ usage }: ContextUsageProps) {
  if (usage.total_tokens === 0 || usage.max_tokens === 0) {
    return null;
  }
  return (
    <Context
      maxTokens={usage.max_tokens}
      usage={createUiUsage(usage)}
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

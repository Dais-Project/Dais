import { LlmProviders } from "@/api/generated/schemas";
import { Badge } from "@/components/ui/badge";
import { PROVIDER_TYPE_LABELS } from "@/constants/provider";
import { cn } from "@/lib/utils";

type ProviderBadgeProps = {
  type: LlmProviders;
};

const PROVIDER_TYPE_COLORS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [LlmProviders.anthropic]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [LlmProviders.gemini]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function ProviderBadge({ type }: ProviderBadgeProps) {
  return <Badge className={cn(PROVIDER_TYPE_COLORS[type], "px-1.5 text-[0.6rem]")}>{PROVIDER_TYPE_LABELS[type]}</Badge>;
}

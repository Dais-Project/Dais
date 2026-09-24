import type { ContentBlockMetadata } from "@/api/generated/schemas";
import type { UiToolMessage } from "@/types/message";

export function useToolResult<
  T extends string | ContentBlockMetadata[] = string | ContentBlockMetadata[],
>(message: UiToolMessage): T | null {
  const { original_result } = message.metadata;
  return (original_result ?? message.result) as T | null;
}

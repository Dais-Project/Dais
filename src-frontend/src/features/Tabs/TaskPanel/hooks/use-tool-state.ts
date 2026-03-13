import type { ToolMessageMetadata } from "@/api/generated/schemas";
import type { UiToolMessage } from "@/types/message";
import type { ToolState } from "@/components/ai-elements/tool";

function getToolState(message: UiToolMessage): ToolState {
  if (message.error !== null) {
    return "output-error";
  }
  if (message.result !== null) {
    return "output-available";
  }
  switch ((message.metadata as ToolMessageMetadata).user_approval) {
    case "pending":
      return "approval-requested";
    case "approved":
      return "approval-responded";
    case "denied":
      return "output-denied";
    default: // do nothing
  }
  return "input-streaming";
}

export function useToolState(message: UiToolMessage): ToolState {
  return getToolState(message);
}

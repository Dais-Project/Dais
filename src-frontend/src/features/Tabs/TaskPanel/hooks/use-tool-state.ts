import type { ToolMessage } from "@/api/generated/schemas";
import type { ToolState } from "@/components/ai-elements/tool";

function getToolState(message: ToolMessage): ToolState {
  if (message.error) {
    return "output-error";
  }
  if (message.result) {
    return "output-available";
  }
  switch (message.metadata.user_approval) {
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

export function useToolState(message: ToolMessage): ToolState {
  return getToolState(message);
}

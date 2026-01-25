import { Activity, useMemo } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";
import { activityVisible } from "@/lib/activity-visible";
import type { ToolMessage as ToolMessageType } from "@/types/message";
import { ToolConfirmation } from "./ToolConfirmation";

export type GeneralToolMessageProps = {
  message: ToolMessageType;
  onCustomToolAction?: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
};

export function GeneralToolMessage({ message }: GeneralToolMessageProps) {
  const toolState: ToolState = (() => {
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
  })();
  const inputObj = useMemo(
    () => JSON.parse(message.arguments),
    [message.arguments]
  );
  return (
    <Tool defaultOpen={toolState === "approval-requested"}>
      <ToolHeader type={`tool-${message.name}`} state={toolState} />
      <ToolContent>
        <ToolInput input={inputObj} />
        <Activity mode={activityVisible(message.result ?? message.error)}>
          <ToolOutput
            output={message.result}
            errorText={message.error ?? undefined}
          />
        </Activity>
        <Activity
          mode={activityVisible(
            [
              "approval-requested",
              "approval-responded",
              "output-denied",
            ].includes(toolState)
          )}
        >
          <ToolConfirmation state={toolState} />
        </Activity>
      </ToolContent>
    </Tool>
  );
}

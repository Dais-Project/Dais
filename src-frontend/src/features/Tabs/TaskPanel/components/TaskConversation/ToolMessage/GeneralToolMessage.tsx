import { Activity } from "react";
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
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { ToolConfirmation } from "./ToolConfirmation";

export type GeneralToolMessageProps = {
  message: ToolMessageType;
};

export function GeneralToolMessage({ message }: GeneralToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument(message.arguments);
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
  return (
    <Tool defaultOpen={toolState === "approval-requested"}>
      <ToolHeader type={`tool-${message.name}`} state={toolState} />
      <ToolContent>
        <ToolInput input={toolArguments ?? message.arguments} />
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
          <ToolConfirmation
            state={toolState}
            onAccept={() => reviewTool(message.tool_call_id, "approved", false)}
            onReject={() => reviewTool(message.tool_call_id, "denied", false)}
          />
        </Activity>
      </ToolContent>
    </Tool>
  );
}

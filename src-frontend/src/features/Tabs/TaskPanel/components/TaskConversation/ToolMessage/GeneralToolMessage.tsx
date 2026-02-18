import { Activity } from "react";
import type { ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";
import { activityVisible } from "@/lib/activity-visible";
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
  const [toolsetName, toolName] = (() => {
    const originalToolName = message.name;
    const hasToolsetName = originalToolName.includes("__");
    if (!hasToolsetName) {
      return [undefined, originalToolName];
    }
    return originalToolName.split("__");
  })() as [string | undefined, string];
  return (
    <Tool
      className="selectable-text"
      defaultOpen={toolState === "approval-requested"}
    >
      <ToolHeader
        className="sticky top-0 z-1 bg-card"
        toolName={toolName}
        toolsetName={toolsetName}
        state={toolState}
      />
      <ToolContent>
        <ToolInput input={toolArguments ?? message.arguments} />
        <Activity mode={activityVisible(message.result ?? message.error)}>
          <ToolOutput
            output={message.result}
            errorText={message.error ?? undefined}
          />
        </Activity>
      </ToolContent>
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
    </Tool>
  );
}

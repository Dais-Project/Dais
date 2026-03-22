import { Activity } from "react";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, ToolState } from "@/components/ai-elements/tool";
import { activityVisible } from "@/lib/activity-visible";
import { ToolMessageMetadata } from "@/api/generated/schemas";
import { UiToolMessage } from "@/types/message";
import { ToolMessageProps } from "./BuiltInToolMessage";
import { ToolConfirmation } from "./BuiltInToolMessage/components/ToolConfirmation";
import { useAgentTaskAction } from "../../hooks/use-agent-task";
import { useToolName } from "../../hooks/use-tool-name";
import { useToolActionable } from "../../hooks/use-tool-actionable";

function getToolState(message: UiToolMessage): ToolState {
  if (message.isStreaming) {
    return "input-streaming";
  }
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

export function GeneralToolMessage({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = message.arguments;
  const toolState = getToolState(message);
  const { toolName, toolsetName } = useToolName(message.name);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;
  return (
    <Tool className="selectable-text mb-0" defaultOpen={toolState === "approval-requested"}>
      <ToolHeader
        className="sticky top-0 z-10 rounded-md bg-card"
        toolName={toolName}
        toolsetName={toolsetName}
        state={toolState}
        riskLevel={(message.metadata as ToolMessageMetadata).risk_level}
        riskReason={(message.metadata as ToolMessageMetadata).risk_reason}
      />
      <ToolContent>
        <ToolInput input={toolArguments} />
        <Activity mode={activityVisible(hasResult)}>
          <ToolOutput output={message.result} errorText={message.error} />
        </Activity>
      </ToolContent>
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved", false)}
          onReject={() => reviewTool(message.call_id, "denied", false)}
        />
      )}
    </Tool>
  );
}

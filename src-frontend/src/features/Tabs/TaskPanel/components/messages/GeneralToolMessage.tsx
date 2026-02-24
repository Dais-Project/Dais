import { Activity } from "react";
import type { ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Separator } from "@/components/ui/separator";
import { activityVisible } from "@/lib/activity-visible";
import { useAgentTaskAction } from "../../hooks/use-agent-task";
import { useToolArgument } from "../../hooks/use-tool-argument";
import { useToolName } from "../../hooks/use-tool-name";
import { useToolState } from "../../hooks/use-tool-state";
import { shouldShowConfirmation, ToolConfirmation } from "./BuiltInToolMessage/components/ToolConfirmation";

export type GeneralToolMessageProps = {
  message: ToolMessageType;
};

export function GeneralToolMessage({ message }: GeneralToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument(message.arguments);
  const toolState = useToolState(message);
  const { toolName, toolsetName } = useToolName(message.name);
  return (
    <Tool className="selectable-text" defaultOpen={toolState === "approval-requested"}>
      <ToolHeader
        className="sticky top-0 z-1 bg-card"
        toolName={toolName}
        toolsetName={toolsetName}
        state={toolState}
      />
      <ToolContent>
        <ToolInput input={toolArguments ?? message.arguments} />
        <Activity mode={activityVisible(message.result ?? message.error)}>
          <ToolOutput output={message.result} errorText={message.error ?? undefined} />
        </Activity>
      </ToolContent>
      <Activity mode={activityVisible(shouldShowConfirmation(toolState))}>
        <Separator className="bg-border/60" />
        <ToolConfirmation
          state={toolState}
          onAccept={() => reviewTool(message.tool_call_id, "approved", false)}
          onReject={() => reviewTool(message.tool_call_id, "denied", false)}
        />
      </Activity>
    </Tool>
  );
}

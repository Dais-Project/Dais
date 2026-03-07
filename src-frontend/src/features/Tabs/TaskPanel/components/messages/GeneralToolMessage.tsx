import { Activity } from "react";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Separator } from "@/components/ui/separator";
import { activityVisible } from "@/lib/activity-visible";
import { ToolMessageProps } from "./BuiltInToolMessage";
import { useAgentTaskAction } from "../../hooks/use-agent-task";
import { useToolName } from "../../hooks/use-tool-name";
import { useToolState } from "../../hooks/use-tool-state";
import { shouldShowConfirmation, ToolConfirmation } from "./BuiltInToolMessage/components/ToolConfirmation";


export function GeneralToolMessage({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = message.arguments;
  const toolState = useToolState(message);
  const { toolName, toolsetName } = useToolName(message.name);
  return (
    <Tool className="selectable-text mb-0" defaultOpen={toolState === "approval-requested"}>
      <ToolHeader
        className="sticky top-0 z-10 rounded-md bg-card"
        toolName={toolName}
        toolsetName={toolsetName}
        state={toolState}
      />
      <ToolContent>
        <ToolInput input={toolArguments} />
        <Activity mode={activityVisible(message.result ?? message.error)}>
          <ToolOutput output={message.result} errorText={message.error ?? undefined} />
        </Activity>
      </ToolContent>
      <Activity mode={activityVisible(shouldShowConfirmation(toolState))}>
        <Separator className="bg-border/60" />
        <ToolConfirmation
          state={toolState}
          onAccept={() => reviewTool(message.call_id, "approved", false)}
          onReject={() => reviewTool(message.call_id, "denied", false)}
        />
      </Activity>
    </Tool>
  );
}

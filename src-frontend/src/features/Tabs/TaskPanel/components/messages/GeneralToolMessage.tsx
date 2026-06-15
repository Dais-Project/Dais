import { Activity } from "react";
import { LinkIcon } from "lucide-react";
import type { TaskResourceMetadata } from "@/api/generated/schemas";
import { createTaskResourceUrl } from "@/api/tasks";
import {
  attachmentCategoryIcons,
  resolveMimetypeCategory,
} from "@/components/ai-elements/attachments";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";
import { activityVisible } from "@/lib/activity-visible";
import type { ToolMessageMetadata } from "@/api/generated/schemas";
import { getToolMessageMetadata, type UiToolMessage } from "@/types/message";
import { isTaskResourceMetadataList } from "@/types/message/type-guards";
import type { ToolMessageProps } from "./BuiltInToolMessage";
import { ToolConfirmation } from "./BuiltInToolMessage/components/ToolConfirmation";
import {
  useAgentTaskAction,
  useAgentTaskState,
} from "../../hooks/use-agent-task";
import { useToolName } from "../../hooks/use-tool-name";
import { useToolActionable } from "../../hooks/use-tool-actionable";
import { useCollapsed } from "../../hooks/use-collapsible-store";
import { cn } from "@/lib/utils";

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

export function ContentBlockItem({ data }: { data: TaskResourceMetadata }) {
  const { taskId, taskType } = useAgentTaskState();

  if ("text" in data) {
    return (
      <CodeBlock
        code={data.text}
        className="w-full"
        language="text"
        showLineNumbers={true}
        startingLineNumber={1}
      />
    );
  }

  if ("url" in data) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
        <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="break-all font-mono">{data.url}</span>
      </div>
    );
  }

  const resourceType = resolveMimetypeCategory(data.mimetype);
  const resourceUrl = createTaskResourceUrl(taskType, taskId, data.resource_id);

  switch (resourceType) {
    case "image":
      return (
        <img
          alt={data.filename}
          className="max-h-80 rounded-lg object-contain"
          src={resourceUrl.toString()}
        />
      );
    case "video":
      return (
        // biome-ignore lint: a11y/useMediaCaption
        <video
          className="max-h-80 rounded-lg"
          controls
          src={resourceUrl.toString()}
        />
      );
    case "audio":
      return (
        // biome-ignore lint: a11y/useMediaCaption
        <audio className="w-full" controls src={resourceUrl.toString()} />
      );
    default: {
      const Icon = attachmentCategoryIcons[resourceType];
      return <Icon className="size-8 text-muted-foreground" />;
    }
  }
}

export function GeneralToolMessage({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = message.arguments;
  const toolState = getToolState(message);
  const { toolName, toolsetName } = useToolName(message.name);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const [collapsed, setCollapsed] = useCollapsed(message.call_id, true);
  const { userApproval, risk } = getToolMessageMetadata(message);

  return (
    <Tool
      open={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
      defaultOpen={false}
      className="selectable visibility-auto mb-0"
    >
      <ToolHeader
        className={cn("sticky top-0 z-10 rounded-md bg-card", {
          "rounded-b-none": !collapsed,
        })}
        toolName={toolName}
        toolsetName={toolsetName}
        state={toolState}
        riskLevel={risk.level}
        riskReason={risk.reason}
      />
      <ToolContent className="bg-card">
        <ToolInput input={toolArguments} />
        <Activity mode={activityVisible(hasResult)}>
          <ToolOutput
            output={
              isTaskResourceMetadataList(message.result) ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  {message.result.map((item, index) => (
                    <ContentBlockItem
                      key={`${typeof item.resource_id}:${item.resource_id}:${index}`}
                      data={item}
                    />
                  ))}
                </div>
              ) : (
                message.result
              )
            }
            errorText={message.error}
          />
        </Activity>
      </ToolContent>
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          riskLevel={risk.level}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved")}
          onReject={() => reviewTool(message.call_id, "denied")}
        />
      )}
    </Tool>
  );
}

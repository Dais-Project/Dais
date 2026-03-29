import { PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemEditFile, ToolMessageMetadata } from "@/api/generated/schemas";
import { EditFileToolSchema } from "@/api/tool-schema";
import { DiffView } from "@/components/custom/DiffView";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { MiddleEllipsis } from "@/components/custom/MiddleEllipsis";

export function EditFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemEditFile>(message, EditFileToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.edit_file.generating")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null && message.result.trim().length > 0) {
      return (
        <div className="px-4 pb-4">
          <DiffView diffText={message.result} />
        </div>
      );
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.edit_file.parse_error")}</p>;
    }
    return (
      <div className="px-4 pb-4">
        <DiffView
          filename={toolArguments.path}
          oldText={toolArguments.old_content}
          newText={toolArguments.new_content}
        />
      </div>
    );
  })();

  return (
    <BuiltInToolContainer id={message.call_id} defaultOpen={!hasResult}>
      <BuiltInToolHeader icon={PencilIcon}>
        <div className="flex items-center min-w-0">
          <span className="font-medium text-sm">{t("tool.edit_file.title")}</span>
          {toolArguments?.path && (
            <MiddleEllipsis className="flex-1 font-medium font-mono text-sm">
              {toolArguments.path}
            </MiddleEllipsis>
          )}
        </div>
      </BuiltInToolHeader>
      <BuiltInToolContent>{content}</BuiltInToolContent>
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved", false)}
          onReject={() => reviewTool(message.call_id, "denied", false)}
        />
      )}
    </BuiltInToolContainer>
  );
}

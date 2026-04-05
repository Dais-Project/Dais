import { PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemEditFile } from "@/api/generated/schemas";
import { EditFileToolSchema } from "@/api/tool-schema";
import { DiffView } from "@/components/custom/DiffView";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { MiddleEllipsis } from "@/components/custom/MiddleEllipsis";
import { getToolMessageMetadata } from "@/types/message";
import { ToolMessageProps } from ".";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader, BuiltInToolTitle } from "./components/BuiltInTool";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";

export function EditFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemEditFile>(message, EditFileToolSchema);
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);

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
    <BuiltInToolContainer id={message.call_id}>
      <BuiltInToolHeader icon={PencilIcon} risk={risk}>
        <BuiltInToolTitle title={t("tool.edit_file.title")}>
          {toolArguments?.path && (
            <MiddleEllipsis className="font-medium font-mono text-sm">
              {toolArguments.path}
            </MiddleEllipsis>
          )}
        </BuiltInToolTitle>
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

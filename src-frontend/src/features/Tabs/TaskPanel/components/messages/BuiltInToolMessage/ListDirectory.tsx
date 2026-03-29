import { FolderTreeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemListDirectory, ToolMessageMetadata } from "@/api/generated/schemas";
import { ListDirectoryToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { MiddleEllipsis } from "@/components/custom/MiddleEllipsis";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";

export function ListDirectory({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemListDirectory>(message, ListDirectoryToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.list_directory.generating")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      if (message.result.trim().length === 0) {
        return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.list_directory.empty")}</p>;
      }
      return (
        <div className="px-4 pb-4">
          <CodeBlock code={message.result} language={"text" as BundledLanguage} showLineNumbers={false} />
        </div>
      );
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.list_directory.parse_error")}</p>;
    }
  })();

  return (
    <BuiltInToolContainer defaultOpen={!hasResult}>
      <BuiltInToolHeader icon={FolderTreeIcon}>
        <div className="flex items-center min-w-0">
          <span className="font-medium text-sm">{t("tool.list_directory.title")}</span>
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

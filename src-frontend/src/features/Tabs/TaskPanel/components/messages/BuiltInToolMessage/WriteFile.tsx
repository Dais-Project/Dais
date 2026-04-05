import { PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemWriteFile } from "@/api/generated/schemas";
import { WriteFileToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { MiddleEllipsis } from "@/components/custom/MiddleEllipsis";
import { getFileExtension } from "@/lib/path";
import { getToolMessageMetadata } from "@/types/message";
import { ToolMessageProps } from ".";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader, BuiltInToolTitle } from "./components/BuiltInTool";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";

export function WriteFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemWriteFile>(message, WriteFileToolSchema);
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);
  const language = (toolArguments?.path && getFileExtension(toolArguments?.path)) ?? "text";

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.write_file.generating")}</p>;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.write_file.parse_error")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    return (
      <div className="px-4 pb-4">
        <CodeBlock code={toolArguments.content} language={language as BundledLanguage} showLineNumbers />
      </div>
    );
  })();

  return (
    <BuiltInToolContainer id={message.call_id}>
      <BuiltInToolHeader icon={PencilIcon} risk={risk}>
        <BuiltInToolTitle title={t("tool.write_file.title")}>
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

import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemSearchText, ToolMessageMetadata } from "@/api/generated/schemas";
import { SearchTextToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader, BuiltInToolTitle } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";

export function SearchText({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemSearchText>(message, SearchTextToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.search_text.generating")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      return (
        <div className="px-4 pb-4">
          <CodeBlock code={message.result} language={"text" as BundledLanguage} showLineNumbers={false} />
        </div>
      );
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.search_text.parse_error")}</p>;
    }
  })();

  return (
    <BuiltInToolContainer id={message.call_id} defaultOpen={!hasResult}>
      <BuiltInToolHeader icon={SearchIcon}>
        <BuiltInToolTitle title={t("tool.search_text.title")}>
          {toolArguments && (
            <div className="truncate font-medium font-mono text-sm">
              {toolArguments.regex}
            </div>
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

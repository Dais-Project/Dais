import { PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemWriteFile } from "@/api/generated/schemas";
import { WriteFileToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolState } from "../../../hooks/use-tool-state";
import { getFileExtension } from "@/lib/path";
import { useToolActionable } from "../../../hooks/use-tool-actionable";

export function WriteFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const state = useToolState(message);
  const toolArguments = useToolArgument<FileSystemWriteFile>(message, WriteFileToolSchema);
  const { hasResult } = useToolActionable(message);
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
    <BuiltInToolContainer
      state={state}
      onUserReviewed={(approved) => {
        const reaction = approved ? "approved" : "denied";
        reviewTool(message.call_id, reaction, false);
      }}
      defaultOpen={!hasResult}
    >
      <BuiltInToolHeader icon={<PencilIcon className="size-4 text-muted-foreground" />}>
        <div className="flex items-center">
          <span className="font-medium text-sm">{t("tool.write_file.title")}</span>
          {toolArguments?.path && (
            <div className="flex-1 truncate font-medium font-mono text-sm">
              {toolArguments.path}
            </div>
          )}
        </div>
      </BuiltInToolHeader>
      <BuiltInToolContent>{content}</BuiltInToolContent>
    </BuiltInToolContainer>
  );
}

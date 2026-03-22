import { FileTextIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemReadFile } from "@/api/generated/schemas";
import { ReadFileToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolState } from "../../../hooks/use-tool-state";

export function ReadFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const state = useToolState(message);
  const toolArguments = useToolArgument<FileSystemReadFile>(message, ReadFileToolSchema);

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.generating")}</p>;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.parse_error")}</p>;
    }
    const showLineNumbers = toolArguments.enable_line_numbers !== true;
    const resultText = typeof message.result === "string" ? message.result : "";
    if (resultText.trim().length === 0) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.empty")}</p>;
    }
    return (
      <div className="px-4 pb-4">
        <CodeBlock code={resultText} language="text" showLineNumbers={showLineNumbers} />
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
      defaultOpen
    >
      <BuiltInToolHeader icon={<FileTextIcon className="size-4 text-muted-foreground" />}>
        <div className="flex items-center">
          <span className="font-medium text-sm">{t("tool.read_file.title")}</span>
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

import { FolderSearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BundledLanguage } from "shiki";
import z from "zod";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemFindFiles, ToolMessageMetadata } from "@/api/generated/schemas";
import { FindFilesToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { tryParseSchema } from "@/lib/utils";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";

const findFilesResultSchema = z.object({
  matches: z.array(z.string()),
  total: z.number(),
  search_root: z.string(),
});

function FindFilesContent({ result }: { result: string }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const parsedResult = tryParseSchema(findFilesResultSchema, result);
  if (parsedResult === null) {
    return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.find_files.parse_error")}</p>;
  }
  return (
    <div className="px-4 pb-4">
      <CodeBlock code={parsedResult.matches.join("\n")} language={"text" as BundledLanguage} showLineNumbers={false} />
    </div>
  );
}

export function FindFiles({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemFindFiles>(message, FindFilesToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.find_files.generating")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      return <FindFilesContent result={message.result} />;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.find_files.parse_error")}</p>;
    }
  })();

  return (
    <BuiltInToolContainer defaultOpen={!hasResult}>
      <BuiltInToolHeader icon={<FolderSearchIcon className="size-4 text-muted-foreground" />}>
        <div className="flex items-center">
          <span className="font-medium text-sm">{t("tool.find_files.title")}</span>
          {toolArguments && (
            <div className="flex-1 truncate font-medium font-mono text-sm">
              {toolArguments.pattern}{toolArguments.path ? ` ${toolArguments.path}` : ""}
            </div>
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

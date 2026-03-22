import { FileTextIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemReadFile, ToolMessageMetadata } from "@/api/generated/schemas";
import { ReadFileToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { getFileExtension } from "@/lib/path";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";

type ParsedReadFileResult = {
  fileContent: string;
  startLineNumber: number;
};

function parseReadFileResult(resultText: string): ParsedReadFileResult {
  if (resultText.trim().length === 0) {
    return { fileContent: "", startLineNumber: 1 };
  }

  if (!resultText.trim().startsWith("<")) {
    return { fileContent: resultText, startLineNumber: 1 };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(resultText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      return { fileContent: resultText, startLineNumber: 1 };
    }

    const contentNode = doc.querySelector("file_content");
    if (!contentNode) {
      return { fileContent: resultText, startLineNumber: 1 };
    }

    const startLineAttribute = contentNode.getAttribute("start_line") ?? "1";
    const parsedStartLine = Number.parseInt(startLineAttribute, 10);
    const startLineNumber = Number.isFinite(parsedStartLine) && parsedStartLine > 0 ? parsedStartLine : 1;
    return { fileContent: contentNode.textContent ?? "", startLineNumber };
  } catch {
    return { fileContent: resultText, startLineNumber: 1 };
  }
}

type ReadFileContentProps = {
  arguments: FileSystemReadFile;
  result: string;
};

function ReadFileContent({ arguments: toolArguments, result }: ReadFileContentProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { language, fileContent, startLineNumber } = useMemo(() => {
    const language = getFileExtension(toolArguments.path) ?? "text";
    const { fileContent, startLineNumber } = parseReadFileResult(result);
    return { language, fileContent, startLineNumber };
  }, [toolArguments, result]);

  if (fileContent.trim().length === 0) {
    return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.empty")}</p>;
  }

  return (
    <div className="px-4 pb-4">
      <CodeBlock
        code={fileContent}
        language={language as BundledLanguage}
        showLineNumbers={true}
        startingLineNumber={startLineNumber}
      />
    </div>
  );
}

export function ReadFile({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<FileSystemReadFile>(message, ReadFileToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.generating")}</p>;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.read_file.parse_error")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      return <ReadFileContent arguments={toolArguments} result={message.result} />;
    }
  })();

  return (
    <BuiltInToolContainer defaultOpen={!hasResult}>
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

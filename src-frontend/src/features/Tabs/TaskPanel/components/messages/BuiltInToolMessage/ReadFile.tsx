import { FileTextIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BundledLanguage, bundledLanguages } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { FileSystemReadFile } from "@/api/generated/schemas";
import { ReadFileToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { MiddleEllipsis } from "@/components/custom/MiddleEllipsis";
import { getFileExtension } from "@/lib/path";
import { getToolMessageMetadata } from "@/types/message";
import { ToolMessageProps } from ".";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader, BuiltInToolTitle } from "./components/BuiltInTool";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";

const MARKDOWNED_FILE_EXTENSIONS = ["pdf", "docx", "pptx", "xlsx", "epub"];

type ParsedReadFileResult = {
  fileContent: string;
  startLineNumber: number;
};

function decodeXmlEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function fallbackParseReadFileResult(resultText: string): ParsedReadFileResult | null {
  const openTagMatch = resultText.match(/<file_content\b([^>]*)>/);
  if (!openTagMatch || openTagMatch.index === undefined) {
    return null;
  }

  const openTag = openTagMatch[0];
  const attributes = openTagMatch[1] ?? "";
  const contentStartIndex = openTagMatch.index + openTag.length;
  const contentEndIndex = resultText.indexOf("</file_content>", contentStartIndex);
  if (contentEndIndex === -1) {
    return null;
  }

  const startLineMatch = attributes.match(/\bstart_line="(\d+)"/);
  const parsedStartLine = Number.parseInt(startLineMatch?.[1] ?? "1", 10);
  const startLineNumber = Number.isFinite(parsedStartLine) && parsedStartLine > 0 ? parsedStartLine : 1;
  const fileContent = decodeXmlEntities(resultText.slice(contentStartIndex, contentEndIndex));

  return { fileContent, startLineNumber };
}

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
    if (!parserError) {
      const contentNode = doc.querySelector("file_content");
      if (contentNode) {
        const startLineAttribute = contentNode.getAttribute("start_line") ?? "1";
        const parsedStartLine = Number.parseInt(startLineAttribute, 10);
        const startLineNumber = Number.isFinite(parsedStartLine) && parsedStartLine > 0 ? parsedStartLine : 1;
        return { fileContent: contentNode.textContent ?? "", startLineNumber };
      }
    }
  } catch {
    // Fall through to string-based parsing.
  }

  const fallbackResult = fallbackParseReadFileResult(resultText);
  if (fallbackResult !== null) {
    return fallbackResult;
  }

  return { fileContent: resultText, startLineNumber: 1 };
}

type ReadFileContentProps = {
  arguments: FileSystemReadFile;
  result: string;
};

function ReadFileContent({ arguments: toolArguments, result }: ReadFileContentProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { language, fileContent, startLineNumber } = useMemo(() => {
    const extension = getFileExtension(toolArguments.path);
    const language = (() => {
      if (extension === null) return "text";
      if (extension in bundledLanguages) return extension;
      if (MARKDOWNED_FILE_EXTENSIONS.includes(extension)) return "markdown";
      return "text";
    })();
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
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);

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
    <BuiltInToolContainer id={message.call_id}>
      <BuiltInToolHeader icon={FileTextIcon} risk={risk}>
        <BuiltInToolTitle title={t("tool.read_file.title")}>
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

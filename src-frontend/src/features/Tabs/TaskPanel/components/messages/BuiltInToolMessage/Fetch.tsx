import { GlobeIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { BundledLanguage } from "shiki";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { WebInteractionFetch } from "@/api/generated/schemas";
import { FetchToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { ToolMessageProps } from ".";
import {
  BuiltInToolContainer,
  BuiltInToolContent,
  BuiltInToolError,
  BuiltInToolHeader,
  BuiltInToolTitle,
} from "./components/BuiltInTool";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { getToolMessageMetadata } from "@/types/message";

type ParsedFetchResult =
  | {
    kind: "document";
    url: string;
    statusCode: number | null;
    reasonPhrase: string;
    content: string;
  }
  | {
    kind: "error";
    url: string;
    statusCode: number | null;
    reasonPhrase: string;
    text: string;
  }
  | {
    kind: "raw";
    rawText: string;
  };

function parseStatusCode(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFetchResult(resultText: string): ParsedFetchResult {
  if (resultText.trim().length === 0) {
    return { kind: "raw", rawText: "" };
  }

  if (!resultText.trim().startsWith("<")) {
    return { kind: "raw", rawText: resultText };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(resultText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      return { kind: "raw", rawText: resultText };
    }

    const documentRoot = doc.querySelector("document");
    if (documentRoot) {
      return {
        kind: "document",
        url: documentRoot.querySelector("url")?.textContent ?? "",
        statusCode: parseStatusCode(
          documentRoot.querySelector("status_code")?.textContent
        ),
        reasonPhrase:
          documentRoot.querySelector("reason_phrase")?.textContent ?? "",
        content:
          documentRoot.querySelector("document_content")?.textContent ?? "",
      };
    }

    const errorRoot = doc.querySelector("error");
    if (errorRoot) {
      return {
        kind: "error",
        url: errorRoot.querySelector("url")?.textContent ?? "",
        statusCode: parseStatusCode(
          errorRoot.querySelector("status_code")?.textContent
        ),
        reasonPhrase: errorRoot.querySelector("reason_phrase")?.textContent ?? "",
        text: errorRoot.querySelector("text")?.textContent ?? "",
      };
    }
    return { kind: "raw", rawText: resultText };
  } catch {
    return { kind: "raw", rawText: resultText };
  }
}

function FetchContent({ result }: { result: string }) {
  const parsed = useMemo(() => parseFetchResult(result), [result]);

  if (parsed.kind === "raw") {
    if (parsed.rawText.trim().length === 0) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">Empty response</p>;
    }
    return (
      <div className="px-4 pb-4">
        <CodeBlock
          code={parsed.rawText}
          language={"text" as BundledLanguage}
          showLineNumbers={false}
        />
      </div>
    );
  }

  const responseSummary = (
    <div className="text-sm">
      <span className="text-muted-foreground">响应状态：</span>
      <span className="font-medium font-mono">{parsed.statusCode ?? "-"} {parsed.reasonPhrase}</span>
    </div>
  );

  if (parsed.kind === "error") {
    const errorText = parsed.text.trim().length === 0 ? "(empty error response body)" : parsed.text;
    return (
      <div className="px-4 pb-4 space-y-2">
        {responseSummary}
        <CodeBlock
          code={errorText}
          language={"text" as BundledLanguage}
          showLineNumbers={false}
        />
      </div>
    );
  }

  if (parsed.content.trim().length === 0) {
    return (
      <div className="px-4 pb-4 space-y-2">
        {responseSummary}
        <p className="text-muted-foreground text-sm">Empty response</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      {responseSummary}
      <CodeBlock
        code={parsed.content}
        language={"markdown" as BundledLanguage}
        showLineNumbers={false}
      />
    </div>
  );
}

export function Fetch({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<WebInteractionFetch>(message, FetchToolSchema);
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);

  const content = (() => {
    if (message.isStreaming) {
      return (
        <p className="px-4 pb-4 text-muted-foreground text-sm">
          {t("tool.fetch.generating")}
        </p>
      );
    }
    if (toolArguments === null) {
      return (
        <p className="px-4 pb-4 text-muted-foreground text-sm">
          {t("tool.fetch.parse_error")}
        </p>
      );
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      return <FetchContent result={message.result} />;
    }
  })();

  return (
    <BuiltInToolContainer id={message.call_id}>
      <BuiltInToolHeader icon={GlobeIcon} risk={risk}>
        <BuiltInToolTitle className="gap-2" title={t("tool.fetch.title")}>
          {toolArguments?.method && (
            <span className="font-medium font-mono text-sm text-muted-foreground">
              {toolArguments.method}
            </span>
          )}
          {toolArguments?.url && (
            <div className="min-w-0 truncate font-medium font-mono text-sm">
              {toolArguments.url}
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

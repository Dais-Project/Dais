import { GlobeIcon, LinkIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type {
  TaskResourceMetadata,
  WebInteractionFetch,
} from "@/api/generated/schemas";
import { createTaskResourceUrl } from "@/api/tasks";
import {
  attachmentCategoryIcons,
  resolveMimetypeCategory,
} from "@/components/ai-elements/attachments";
import { FetchToolSchema } from "@/api/tool-schema";
import { CodeBlock } from "@/components/ai-elements/code-block";
import type { ToolMessageProps } from ".";
import {
  BuiltInToolContainer,
  BuiltInToolContent,
  BuiltInToolError,
  BuiltInToolHeader,
  BuiltInToolTitle,
} from "./components/BuiltInTool";
import {
  useAgentTaskAction,
  useAgentTaskState,
} from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { getToolMessageMetadata } from "@/types/message";
import { isTaskResourceMetadataList } from "@/types/message/type-guards";

type ParsedFetchResult =
  | {
      kind: "success";
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

    const fetchRoot = doc.querySelector("fetch");
    if (fetchRoot) {
      return {
        kind: "success",
        url: fetchRoot.querySelector("url")?.textContent ?? "",
        statusCode: parseStatusCode(
          fetchRoot.querySelector("status_code")?.textContent,
        ),
        reasonPhrase:
          fetchRoot.querySelector("reason_phrase")?.textContent ?? "",
        content: fetchRoot.querySelector("document_content")?.textContent ?? "",
      };
    }

    const errorRoot = doc.querySelector("error");
    if (errorRoot) {
      return {
        kind: "error",
        url: errorRoot.querySelector("url")?.textContent ?? "",
        statusCode: parseStatusCode(
          errorRoot.querySelector("status_code")?.textContent,
        ),
        reasonPhrase:
          errorRoot.querySelector("reason_phrase")?.textContent ?? "",
        text: errorRoot.querySelector("text")?.textContent ?? "",
      };
    }
    return { kind: "raw", rawText: resultText };
  } catch {
    return { kind: "raw", rawText: resultText };
  }
}

function FetchContentBlockItem({ data }: { data: TaskResourceMetadata }) {
  const { taskId, taskType } = useAgentTaskState();

  if ("text" in data) {
    return (
      <CodeBlock
        code={data.text}
        language="text"
        showLineNumbers={true}
        startingLineNumber={1}
      />
    );
  }

  if ("url" in data) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm">
        <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="break-all font-mono">{data.url}</span>
      </div>
    );
  }

  const resourceType = resolveMimetypeCategory(data.mimetype);
  const resourceUrl = createTaskResourceUrl(taskType, taskId, data.resource_id);

  switch (resourceType) {
    case "image":
      return (
        <img
          alt={data.filename}
          className="max-h-80 rounded-lg object-contain"
          src={resourceUrl.toString()}
        />
      );
    case "video":
      return (
        // biome-ignore lint: a11y/useMediaCaption
        <video
          className="max-h-80 rounded-lg"
          controls
          src={resourceUrl.toString()}
        />
      );
    case "audio":
      return (
        // biome-ignore lint: a11y/useMediaCaption
        <audio className="w-full" controls src={resourceUrl.toString()} />
      );
    default: {
      const Icon = attachmentCategoryIcons[resourceType];
      return <Icon className="size-8 text-muted-foreground" />;
    }
  }
}

function FetchContentBlocks({ result }: { result: TaskResourceMetadata[] }) {
  const [_fetchMetadata, actualResult] = result;

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 pb-4">
      <FetchContentBlockItem data={actualResult} />
    </div>
  );
}

function FetchTextContent({ result }: { result: string }) {
  const parsed = useMemo(() => parseFetchResult(result), [result]);

  if (parsed.kind === "raw") {
    if (parsed.rawText.trim().length === 0) {
      return (
        <p className="px-4 pb-4 text-muted-foreground text-sm">
          Empty response
        </p>
      );
    }
    return (
      <div className="px-4 pb-4">
        <CodeBlock
          code={parsed.rawText}
          language="text"
          showLineNumbers={false}
        />
      </div>
    );
  }

  const responseSummary = (
    <div className="text-sm">
      <span className="text-muted-foreground">响应状态：</span>
      <span className="font-medium font-mono">
        {parsed.statusCode ?? "-"} {parsed.reasonPhrase}
      </span>
    </div>
  );

  if (parsed.kind === "error") {
    const errorText =
      parsed.text.trim().length === 0
        ? "(empty error response body)"
        : parsed.text;
    return (
      <div className="px-4 pb-4 space-y-2">
        {responseSummary}
        <CodeBlock code={errorText} language="text" showLineNumbers={false} />
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
        language="markdown"
        showLineNumbers={false}
      />
    </div>
  );
}

function FetchResult({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const toolArguments = useToolArgument<WebInteractionFetch>(
    message,
    FetchToolSchema,
  );
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
  const { result, error } = message;
  if (error) {
    return <BuiltInToolError error={error} />;
  }
  if (result !== null) {
    if (isTaskResourceMetadataList(result)) {
      return <FetchContentBlocks result={result} />;
    }
    return <FetchTextContent result={result as string} />;
  }
  return null;
}

export function Fetch({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const toolArguments = useToolArgument<WebInteractionFetch>(
    message,
    FetchToolSchema,
  );
  const { reviewTool } = useAgentTaskAction();
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);

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
      <BuiltInToolContent>
        <FetchResult message={message} />
      </BuiltInToolContent>
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          riskLevel={risk.level}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved")}
          onReject={() => reviewTool(message.call_id, "denied")}
        />
      )}
    </BuiltInToolContainer>
  );
}

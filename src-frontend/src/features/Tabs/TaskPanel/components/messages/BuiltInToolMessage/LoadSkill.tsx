import { BookOpenIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { ContextControlLoadSkill, ToolMessageMetadata } from "@/api/generated/schemas";
import { LoadSkillToolSchema } from "@/api/tool-schema";
import { Markdown } from "@/components/custom/Markdown";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolError, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ToolConfirmation } from "./components/ToolConfirmation";

function parseLoadSkillResult(resultText: string): string | null {
  if (resultText.trim().length === 0) {
    return null;
  }

  if (!resultText.trim().startsWith("<")) {
    return resultText;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(resultText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      return resultText;
    }
    const skillContent = doc.querySelector("skill_content")?.textContent ?? null;
    if (!skillContent) {
      return resultText;
    }
    return skillContent;
  } catch {
    return resultText;
  }
}

function LoadSkillContent({ result }: { result: string }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const skillContent = useMemo(() => parseLoadSkillResult(result), [result]);

  if (!skillContent) {
    return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.load_skill.empty")}</p>;
  }

  return <Markdown className="pt-2 px-6 pb-4">{skillContent}</Markdown>;
}

export function LoadSkill({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<ContextControlLoadSkill>(message, LoadSkillToolSchema);
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.load_skill.generating")}</p>;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.load_skill.parse_error")}</p>;
    }
    if (message.error) {
      return <BuiltInToolError error={message.error} />;
    }
    if (message.result !== null) {
      return <LoadSkillContent result={message.result} />;
    }
  })();

  return (
    <BuiltInToolContainer id={message.call_id} defaultOpen={!hasResult}>
      <BuiltInToolHeader icon={BookOpenIcon}>
        <div className="flex items-center min-w-0">
          <span className="font-medium text-sm">{t("tool.load_skill.title")}</span>
          {toolArguments?.name && (
            <div className="flex-1 truncate font-medium font-mono text-sm">{toolArguments.name}</div>
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

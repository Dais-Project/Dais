import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { OsInteractionsShell } from "@/api/generated/schemas";
import { ShellToolSchema } from "@/api/tool-schema";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { CollapsibleTerminal } from "@/components/custom/CollapsibleTerminal";
import { RiskBadge } from "@/components/ai-elements/tool";
import type { ToolMessageProps } from ".";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useCollapsed } from "../../../hooks/use-collapsible-store";
import { getToolMessageMetadata } from "@/types/message";
import { XmlRawContentParser } from "@/lib/escape-xml";

type ShellResult = {
  stdout: string | null;
  stderr: string | null;
};

function parseShellResult(resultText: string): ShellResult {
  if (resultText.trim().length === 0) {
    return { stdout: null, stderr: null };
  }

  if (!resultText.trim().startsWith("<")) {
    return { stdout: resultText, stderr: null };
  }

  try {
    const parser = XmlRawContentParser.parse(resultText, ["stdout", "stderr"]);
    const stdout = parser.getRawContent("stdout");
    const stderr = parser.getRawContent("stderr");
    return { stdout, stderr };
  } catch {
    return { stdout: resultText, stderr: null };
  }
}

function useShellDisplay(
  message: ToolMessageProps["message"],
): [string, ShellResult] {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const toolArguments = useToolArgument<OsInteractionsShell>(
    message,
    ShellToolSchema,
  );
  const { userApproval } = getToolMessageMetadata(message);

  const input = useMemo(() => {
    if (toolArguments === null) {
      return message.isStreaming
        ? t("tool.shell.generating")
        : t("tool.shell.parse_error");
    }
    if (toolArguments.args === null || toolArguments.args === undefined) {
      return toolArguments.command;
    }
    return [toolArguments.command, ...toolArguments.args].join(" ");
  }, [toolArguments, message, t]);

  const output: ShellResult = useMemo(() => {
    if (message.isStreaming) {
      return { stdout: null, stderr: null };
    }
    if (message.error !== null) {
      return { stdout: null, stderr: message.error };
    }
    if (message.result === null) {
      if (userApproval === "pending") {
        return {
          stdout: t("tool.shell.waiting_approval"),
          stderr: null,
        };
      }
      return { stdout: t("tool.shell.executing"), stderr: null };
    }
    return parseShellResult(message.result as string);
  }, [message.isStreaming, message.error, message.result, userApproval, t]);

  return [input, output];
}

export function Shell({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const { hasResult, disabled, markAsSubmitted } = useToolActionable(message);
  const [collapsed, setCollapsed] = useCollapsed(message.call_id, hasResult);
  const { risk } = getToolMessageMetadata(message);
  const toolArguments = useToolArgument<OsInteractionsShell>(
    message,
    ShellToolSchema,
  );
  const { userApproval } = getToolMessageMetadata(message);
  const [commandInput, commandOutput] = useShellDisplay(message);

  return (
    <CollapsibleTerminal
      input={commandInput}
      stdout={commandOutput.stdout}
      stderr={commandOutput.stderr}
      isStreaming={message.isStreaming}
      autoScroll={true}
      open={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
      defaultOpen={true}
      className="visibility-auto"
      title={toolArguments?.command ?? "Shell"}
      actions={
        risk.level !== undefined ? (
          <RiskBadge level={risk.level} reason={risk.reason} />
        ) : null
      }
    >
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          riskLevel={risk.level}
          className="bg-zinc-950"
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved")}
          onReject={() => reviewTool(message.call_id, "denied")}
        />
      )}
    </CollapsibleTerminal>
  );
}

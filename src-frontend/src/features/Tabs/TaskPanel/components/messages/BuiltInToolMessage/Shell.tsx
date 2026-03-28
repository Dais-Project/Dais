import { OsInteractionsShell, ToolMessageMetadata } from "@/api/generated/schemas";
import { ShellToolSchema } from "@/api/tool-schema";
import { ToolMessageProps } from ".";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { CollapsibleTerminal } from "@/components/custom/CollapsibleTerminal";

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
    const parser = new DOMParser();
    const doc = parser.parseFromString(resultText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      return { stdout: resultText, stderr: null };
    }

    const shellResult = doc.querySelector("shell_result");
    if (!shellResult) {
      return { stdout: resultText, stderr: null };
    }

    const stdoutNode = shellResult.querySelector("stdout");
    const stderrNode = shellResult.querySelector("stderr");
    const stdout = stdoutNode?.textContent ?? null;
    const stderr = stderrNode?.textContent ?? null;
    return { stdout, stderr };
  } catch {
    return { stdout: resultText, stderr: null };
  }
}

export function Shell({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<OsInteractionsShell>(message, ShellToolSchema);
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const commandInput = (() => {
    if (toolArguments === null) {
      return "参数解析失败";
    }
    if (toolArguments.args === null || toolArguments.args === undefined) {
      return toolArguments.command;
    }
    return [toolArguments.command, ...toolArguments.args].join(" ");
  })();
  const commandOutput: ShellResult = (() => {
    if (message.isStreaming) {
      return { stdout: "命令运行中", stderr: null };
    }
    if (message.error !== null) {
      return { stdout: null, stderr: message.error };
    }
    if (message.result === null) {
      if (userApproval === "pending") {
        return { stdout: "等待确认...", stderr: null };
      }
      return { stdout: "正在执行...", stderr: null };
    }
    return parseShellResult(message.result);
  })();

  return (
    <CollapsibleTerminal
      input={commandInput}
      {...commandOutput}
      isStreaming={message.isStreaming}
      autoScroll={true}
      defaultOpen={true}
      title={toolArguments?.command ?? "Shell"}
    >
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved", false)}
          onReject={() => reviewTool(message.call_id, "denied", false)}
        />
      )}
    </CollapsibleTerminal>
  );
}

import { CheckCircleIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { CustomTool } from "@/components/custom/ai-components/CustomTool";
import type { ToolMessage as ToolMessageType } from "@/types/message";
import { useToolArgument } from "../../../hooks/use-tool-argument";

export type FinishTaskToolMessageProps = {
  message: ToolMessageType;
};

export function FinishTaskToolMessage({ message }: FinishTaskToolMessageProps) {
  const toolArguments = useToolArgument<{ task_summary: string }>(
    message.arguments
  );

  return (
    <CustomTool
      title="任务完成"
      icon={<CheckCircleIcon className="size-4 text-green-600" />}
      defaultOpen
    >
      {toolArguments?.task_summary && (
        <Streamdown className="px-4 pb-4 text-foreground text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {toolArguments.task_summary}
        </Streamdown>
      )}
    </CustomTool>
  );
}

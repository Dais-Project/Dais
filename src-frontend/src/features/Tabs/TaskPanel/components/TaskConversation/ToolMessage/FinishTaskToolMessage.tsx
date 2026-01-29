import { CheckCircleIcon } from "lucide-react";
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
    >
      {toolArguments?.task_summary && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">任务总结：</p>
          <p className="whitespace-pre-wrap text-sm">
            {toolArguments.task_summary}
          </p>
        </div>
      )}
    </CustomTool>
  );
}

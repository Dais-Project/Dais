import { CheckCircleIcon } from "lucide-react";
import { CustomTool } from "@/components/custom/ai-components/CustomTool";
import type { ToolMessage as ToolMessageType } from "@/types/message";

export type FinishTaskToolMessageProps = {
  message: ToolMessageType;
  onCustomToolAction?: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
};

export function FinishTaskToolMessage({
  message,
}: FinishTaskToolMessageProps) {
  const toolArguments = JSON.parse(message.arguments) as Record<
    string,
    unknown
  >;
  const taskSummary = toolArguments.task_summary as string;

  return (
    <CustomTool
      title="任务完成"
      icon={<CheckCircleIcon className="size-4 text-green-600" />}
    >
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">任务总结：</p>
        <p className="whitespace-pre-wrap text-sm">{taskSummary}</p>
      </div>
    </CustomTool>
  );
}

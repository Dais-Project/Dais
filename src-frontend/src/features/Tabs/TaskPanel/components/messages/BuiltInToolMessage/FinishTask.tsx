import { CheckCircleIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import type { ExecutionControlFinishTask, ToolMessage } from "@/api/generated/schemas";
import { CustomTool } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { useToolArgument } from "../../../hooks/use-tool-argument";

type FinishTaskProps = {
  message: ToolMessage;
};

export function FinishTask({ message }: FinishTaskProps) {
  const toolArguments = useToolArgument<ExecutionControlFinishTask>(message.arguments);

  return (
    <CustomTool title="任务完成" icon={<CheckCircleIcon className="size-4 text-green-600" />} defaultOpen>
      {toolArguments?.task_summary && (
        <Streamdown className="px-4 pb-4 text-foreground text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {toolArguments.task_summary}
        </Streamdown>
      )}
    </CustomTool>
  );
}

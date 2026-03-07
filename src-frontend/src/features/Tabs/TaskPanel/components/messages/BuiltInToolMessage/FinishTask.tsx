import { CheckCircleIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import type { ExecutionControlFinishTask } from "@/api/generated/schemas";
import { CustomTool, CustomToolContent } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { FinishTaskSchema } from "@/api/tool-schema";
import { ToolMessageProps } from ".";
import { useToolArgument } from "../../../hooks/use-tool-argument";


export function FinishTask({ message }: ToolMessageProps) {
  const toolArguments = useToolArgument<ExecutionControlFinishTask>(message, FinishTaskSchema);

  return (
    <CustomTool title="任务完成" icon={<CheckCircleIcon className="size-4 text-green-600" />} defaultOpen>
      <CustomToolContent>
        {toolArguments?.task_summary && (
          <Streamdown className="px-4 pb-4 text-foreground text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {toolArguments.task_summary}
          </Streamdown>
        )}
      </CustomToolContent>
    </CustomTool>
  );
}

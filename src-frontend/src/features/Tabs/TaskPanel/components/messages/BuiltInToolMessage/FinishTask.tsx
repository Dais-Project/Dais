import { CheckCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { ExecutionControlFinishTask } from "@/api/generated/schemas";
import { FinishTaskSchema } from "@/api/tool-schema";
import { Markdown } from "@/components/custom/Markdown";
import { ToolMessageProps } from ".";
import { CustomTool, CustomToolContent } from "./components/CustomTool";
import { useToolArgument } from "../../../hooks/use-tool-argument";


export function FinishTask({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const toolArguments = useToolArgument<ExecutionControlFinishTask>(message, FinishTaskSchema);

  return (
    <CustomTool title={t("tool.finish_task.title")} icon={<CheckCircleIcon className="size-4 text-green-600" />} defaultOpen>
      <CustomToolContent>
        {toolArguments?.task_summary && (
          <Markdown className="px-4 pb-4">{toolArguments.task_summary}</Markdown>
        )}
      </CustomToolContent>
    </CustomTool>
  );
}

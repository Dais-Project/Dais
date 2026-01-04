import { BotIcon, WorkflowIcon } from "lucide-react";
import type { TaskType } from "@/types/task";

type TaskIconProps = {
  taskType: TaskType;
} & React.ComponentProps<"svg">;

export function TaskIcon({ taskType, ...props }: TaskIconProps) {
  switch (taskType) {
    case "agent":
      return <BotIcon {...props} />;
    case "orchestration":
      return <WorkflowIcon {...props} />;
    default:
      console.warn(`Unknown task type: ${taskType}`);
      return null;
  }
}

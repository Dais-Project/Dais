import { InfoIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { BuiltInTools, type TaskRead, type ToolMessageMetadata } from "@/api/generated/schemas";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isToolMessageCompleted } from "@/types/message";
import { useAgentTaskAction, useAgentTaskState } from "../hooks/use-agent-task";

function shouldShow(data: TaskRead): boolean {
  const lastMessage = data.messages.at(-1);
  if (!lastMessage || lastMessage.role === "system") {
    return false;
  }
  if (lastMessage.role === "user" || lastMessage.role === "assistant") {
    return true;
  }
  // assertion: lastMessage.role === "tool"
  if (lastMessage.name === BuiltInTools.ExecutionControl__finish_task) {
    return false;
  }
  if (isToolMessageCompleted(lastMessage)) {
    return true;
  }
  const userApproval = (lastMessage.metadata as ToolMessageMetadata)?.user_approval;
  if (userApproval === "pending") {
    return false;
  }
  if (userApproval === "approved" || userApproval === "denied") {
    return true;
  }
  return false;
}

export function ContinueTask() {
  const { data } = useAgentTaskState();
  const { continue: continueTask } = useAgentTaskAction();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShow(data));
  }, [data]);

  if (!show) {
    return null;
  }

  return (
    <Alert className="min-w-fit items-stretch rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <InfoIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div>任务已暂停，点击继续执行</div>
        <Button onClick={() => continueTask()} size="sm">
          <PlayIcon />
          继续任务
        </Button>
      </AlertTitle>
    </Alert>
  );
}

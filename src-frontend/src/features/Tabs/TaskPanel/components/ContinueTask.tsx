import { InfoIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isToolMessageCompleted } from "@/types/message";
import type { TaskRead } from "@/types/task";
import { useAgentTaskAction, useAgentTaskState } from "../hooks/use-agent-task";

function shouldShow(state: string, data: TaskRead): boolean {
  if (state === "waiting" || state === "running") {
    return false;
  }
  const lastMessage = data.messages.at(-1);
  if (!lastMessage || lastMessage.role === "system") {
    return false;
  }
  if (lastMessage.role === "user" || lastMessage.role === "assistant") {
    return true;
  }
  // assertion: lastMessage.role === "tool"
  if (lastMessage.name === "finish_task") {
    return false;
  }
  if (isToolMessageCompleted(lastMessage)) {
    return true;
  }
  const { user_approval } = lastMessage.metadata;
  if (user_approval === "pending") {
    return false;
  }
  if (user_approval === "approved" || user_approval === "denied") {
    return true;
  }
  return false;
}

export function ContinueTask() {
  const { state, data } = useAgentTaskState();
  const { continue: continueTask } = useAgentTaskAction();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShow(state, data));
  }, [state, data]);

  if (!show) {
    return null;
  }

  return (
    <Alert className="flex w-4/5 min-w-fit items-stretch self-center rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <InfoIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div className="">任务已暂停，点击继续执行</div>
        <Button onClick={() => continueTask()} size="sm">
          <PlayIcon />
          继续任务
        </Button>
      </AlertTitle>
    </Alert>
  );
}
